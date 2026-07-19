import re
import logging
from datetime import datetime
from database import supabase

logger = logging.getLogger(__name__)

# Basic Regex for validation
EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"
PHONE_REGEX = r"^\+?[\d\s-]{7,15}$"

def validate_candidate(data: dict) -> list:
    """
    Validates candidate fields and returns a list of error messages.
    """
    errors = []
    
    # 1. Null / Missing checks
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip()
    
    if not full_name:
        errors.append("Candidate Name is required.")
    
    if not email:
        errors.append("Email address is required.")
    elif not re.match(EMAIL_REGEX, email):
        errors.append("Invalid email address format.")
        
    phone = (data.get("phone") or "").strip()
    if phone and not re.match(PHONE_REGEX, phone):
        errors.append("Invalid phone number format.")
        
    return errors

def check_duplicate_email(email: str) -> bool:
    """
    Checks if a candidate with the given email already exists in Supabase.
    """
    try:
        res = supabase.table("candidates").select("id").eq("email", email).execute()
        return len(res.data) > 0
    except Exception as e:
        logger.error(f"Error checking duplicate email: {e}")
        return False

def save_candidate_pipeline(candidate_data: dict, filename: str = None, file_size: int = None) -> dict:
    """
    Executes the candidate upload/creation pipeline:
    1. Generates fallback email/phone if missing.
    2. Checks if candidate already exists by email. If so, retrieves the record.
    3. If not, inserts candidate record.
    4. Extracts and inserts skills.
    5. Records the upload metadata.
    
    If any downstream insert fails, rolls back candidate creation (if new).
    """
    # 1. Fallback generation for frontend missing fields
    name = (candidate_data.get("full_name") or candidate_data.get("name") or "Unknown Candidate").strip()
    email = (candidate_data.get("email") or "").strip()
    if not email:
        clean_name = re.sub(r"[^a-zA-Z0-9]", "", name).lower()
        email = f"{clean_name or 'candidate'}@example.com"
        
    phone = (candidate_data.get("phone") or "").strip()
    
    payload = {
        "full_name": name,
        "email": email,
        "phone": phone,
        "education": candidate_data.get("education") or "",
        "experience": candidate_data.get("experience") or "",
        "projects": candidate_data.get("projects") or candidate_data.get("project") or "",
        "certificates": candidate_data.get("certificates") or "",
        "resume_url": candidate_data.get("resume_url") or ""
    }
    
    # Validation
    errors = validate_candidate(payload)
    if errors:
        return {"success": False, "errors": errors}
        
    candidate_id = None
    is_new = False
    try:
        # Step 2: Check duplicate email
        existing_res = supabase.table("candidates").select("*").eq("email", email).execute()
        if existing_res.data:
            candidate_record = existing_res.data[0]
            candidate_id = candidate_record.get("id")
            logger.info(f"Using existing candidate record for {email} with ID {candidate_id}")
        else:
            # Step 1: Save into candidates table
            db_payload = {
                "full_name": name,
                "email": email,
                "phone": phone,
                "education": payload["education"].strip(),
                "experience": payload["experience"].strip(),
                "projects": payload["projects"].strip(),
                "certificates": payload["certificates"].strip(),
                "resume_url": payload["resume_url"].strip()
            }
            cand_res = supabase.table("candidates").insert(db_payload).execute()
            if not cand_res.data:
                raise Exception("Failed to insert candidate record: No data returned from Supabase.")
            candidate_record = cand_res.data[0]
            candidate_id = candidate_record.get("id")
            is_new = True
            logger.info(f"Successfully saved new candidate {candidate_id}")
            
        # Step 2: Extract & Save Candidate Skills
        skills_str = candidate_data.get("skills") or ""
        skills_list = [s.strip() for s in skills_str.split(",") if s.strip()]
        
        if skills_list:
            skills_payload = [{"candidate_id": candidate_id, "skill_name": s} for s in skills_list]
            supabase.table("candidate_skills").insert(skills_payload).execute()
            logger.info(f"Saved {len(skills_list)} skills for candidate {candidate_id}")
            
        # Step 3: Record Upload Metadata
        if filename:
            upload_payload = {
                "candidate_id": candidate_id,
                "file_name": filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "file_size": file_size or 0
            }
            supabase.table("uploads").insert(upload_payload).execute()
            logger.info(f"Saved upload record for candidate {candidate_id}")
            
        return {
            "success": True,
            "candidate_id": candidate_id,
            "candidate": candidate_record,
            "skills": skills_list
        }
        
    except Exception as e:
        logger.error(f"Error in candidate save pipeline: {e}")
        # Rollback: Clean up candidate if created to prevent orphaned/partial data
        if candidate_id and is_new:
            logger.warning(f"Rolling back candidate creation for ID {candidate_id}")
            try:
                supabase.table("candidates").delete().eq("id", candidate_id).execute()
            except Exception as rollback_err:
                logger.error(f"Rollback failed: {rollback_err}")
                
        return {"success": False, "errors": [str(e)]}

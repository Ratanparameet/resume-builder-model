import logging
from datetime import datetime
from database import supabase

logger = logging.getLogger(__name__)

def add_to_shortlist(candidate_id: str):
    """
    Adds a candidate to the shortlist table in Supabase.
    Prevents duplicates.
    """
    if not candidate_id:
        raise ValueError("candidate_id is required to add to shortlist.")
        
    try:
        # Check if already shortlisted
        existing = supabase.table("shortlist").select("id").eq("candidate_id", candidate_id).execute()
        if existing.data:
            return {"success": True, "message": "Candidate is already shortlisted.", "data": existing.data[0]}
            
        db_payload = {
            "candidate_id": candidate_id,
            "created_at": datetime.utcnow().isoformat()
        }
        res = supabase.table("shortlist").insert(db_payload).execute()
        if not res.data:
            raise Exception("No data returned from Supabase when adding to shortlist.")
            
        logger.info(f"Successfully added candidate {candidate_id} to shortlist.")
        return {"success": True, "data": res.data[0]}
    except Exception as e:
        logger.error(f"Error adding candidate {candidate_id} to shortlist: {str(e)}")
        raise e

def remove_from_shortlist_by_candidate(candidate_id: str):
    """
    Removes a candidate from the shortlist table.
    """
    try:
        res = supabase.table("shortlist").delete().eq("candidate_id", candidate_id).execute()
        logger.info(f"Successfully removed candidate {candidate_id} from shortlist.")
        return {"success": True, "data": res.data}
    except Exception as e:
        logger.error(f"Error removing candidate {candidate_id} from shortlist: {str(e)}")
        raise e

def get_shortlist_candidates():
    """
    Retrieves all shortlisted candidates with their nested profiles, predictions, and skills.
    Formats the records to match the frontend state layout.
    """
    try:
        # Query shortlist joining candidates and their predictions + skills
        res = supabase.table("shortlist").select(
            "*, candidates(*, predications(*), candidate_skills(*))"
        ).execute()
        
        records = res.data or []
        formatted_list = []
        
        for rec in records:
            cand = rec.get("candidates")
            if not cand:
                continue
                
            preds = cand.get("predications") or []
            pred = preds[0] if len(preds) > 0 else {}
            
            skills_list = cand.get("candidate_skills") or []
            skills_str = ", ".join([s.get("skill_name", "") for s in skills_list])
            
            # Map database schema to frontend expected layout
            formatted = {
                "id": cand.get("id"),
                "name": cand.get("full_name"),
                "aiPredicted": pred.get("explanation", "").split("matched")[-1].strip() or "Unknown", # Fallback role
                "aiConfidence": pred.get("confidence") or 0.0,
                "bestRuleRole": "Web Development Intern", # Default fallback placeholder
                "bestRuleScore": int(pred.get("overall_score") or 50.0),
                "category": pred.get("match_level") or "Moderate Fit",
                "fullProfile": {
                    "id": cand.get("id"),
                    "name": cand.get("full_name"),
                    "education": cand.get("education") or "",
                    "experience": cand.get("experience") or "",
                    "skills": skills_str,
                    "projects": cand.get("projects") or "",
                    "certificates": cand.get("certificates") or ""
                }
            }
            
            # Extract role name if present in the explanation or default to a reasonable value
            # Let's see: the frontend computeDecisionEngine takes aiPredicted, bestRuleRole, bestRuleScore, aiConfPct.
            # We can extract the final role from candidate's prediction or pass the data directly.
            # Wait, let's keep it robust by storing the original prediction values.
            formatted_list.append(formatted)
            
        return formatted_list
    except Exception as e:
        logger.error(f"Error getting shortlist: {str(e)}")
        return []

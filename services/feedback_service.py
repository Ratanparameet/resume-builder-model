import logging
from datetime import datetime
from database import supabase

logger = logging.getLogger(__name__)

def save_feedback(candidate_id: str, rating: int, remarks: str):
    """
    Saves feedback for a candidate to the feedback table in Supabase.
    """
    if not candidate_id:
        raise ValueError("candidate_id is required for feedback.")
    if rating is None or not (1 <= int(rating) <= 5):
        raise ValueError("rating must be an integer between 1 and 5.")
        
    try:
        db_payload = {
            "candidate_id": candidate_id,
            "rating": int(rating),
            "remarks": remarks.strip() if remarks else "",
            "created_at": datetime.utcnow().isoformat()
        }
        
        res = supabase.table("feedback").insert(db_payload).execute()
        if not res.data:
            raise Exception("No data returned from Supabase when saving feedback.")
            
        logger.info(f"Successfully saved feedback for candidate {candidate_id}")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error saving feedback: {str(e)}")
        raise e

def get_feedback_by_candidate(candidate_id: str):
    """
    Retrieves all feedback records for a specific candidate.
    """
    try:
        res = supabase.table("feedback").select("*").eq("candidate_id", candidate_id).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching feedback for candidate {candidate_id}: {str(e)}")
        return []

def delete_feedback(feedback_id: str):
    """
    Deletes a feedback record by its ID.
    """
    try:
        res = supabase.table("feedback").delete().eq("id", feedback_id).execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        logger.error(f"Error deleting feedback {feedback_id}: {str(e)}")
        raise e

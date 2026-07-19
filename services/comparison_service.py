import logging
from datetime import datetime
from database import supabase

logger = logging.getLogger(__name__)

def save_comparison(candidate1_id: str, candidate2_id: str, winner_id: str = None, target_role: str = None):
    """
    Saves a comparison record in Supabase.
    """
    if not candidate1_id or not candidate2_id:
        raise ValueError("Both candidate1_id and candidate2_id are required for comparison.")
        
    try:
        db_payload = {
            "candidate1_id": candidate1_id,
            "candidate2_id": candidate2_id,
            "target_role": target_role,
            "winner": winner_id if winner_id else None,
            "comparison_date": datetime.utcnow().isoformat()
        }
        
        res = supabase.table("comparisons").insert(db_payload).execute()
        if not res.data:
            raise Exception("No data returned from Supabase when saving comparison.")
            
        logger.info(f"Successfully saved comparison between candidate {candidate1_id} and {candidate2_id}")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error saving comparison: {str(e)}")
        raise e

def get_comparisons():
    """
    Retrieves all comparison records from the comparisons table in Supabase.
    """
    try:
        res = supabase.table("comparisons").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching comparisons: {str(e)}")
        return []

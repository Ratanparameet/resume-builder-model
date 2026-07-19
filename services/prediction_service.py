import logging
from datetime import datetime
from database import supabase

logger = logging.getLogger(__name__)

def save_prediction(candidate_id: str, confidence: float, overall_score: float, match_level: str, explanation: str):
    """
    Saves the AI/ML model prediction details to the predications table in Supabase.
    """
    if not candidate_id:
        raise ValueError("candidate_id is required to save a prediction.")
        
    try:
        db_payload = {
            "candidate_id": candidate_id,
            "confidence": float(confidence),
            "overall_score": float(overall_score),
            "match_level": match_level,
            "explanation": explanation,
            "created_at": datetime.utcnow().isoformat()
        }
        
        res = supabase.table("predications").insert(db_payload).execute()
        if not res.data:
            raise Exception("No data returned from Supabase when saving prediction.")
            
        logger.info(f"Successfully saved prediction for candidate {candidate_id}")
        return res.data[0]
    except Exception as e:
        logger.error(f"Error saving prediction for candidate {candidate_id}: {str(e)}")
        raise e

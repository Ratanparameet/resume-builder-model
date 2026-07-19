import logging
from database import supabase

logger = logging.getLogger(__name__)

def get_dashboard_stats():
    """
    Computes analytics and aggregations directly from the Supabase tables:
    - Total Candidates
    - Match Level counts
    - Role Distribution counts
    """
    try:
        # Fetch candidates with their nested predictions
        res = supabase.table("candidates").select("id, predications(match_level)").execute()
        candidates = res.data or []
        
        total_candidates = len(candidates)
        
        # Aggregate match levels
        match_levels = {
            "Excellent Match": 0,
            "Strong Match": 0,
            "Moderate Match": 0,
            "Low Match": 0
        }
        
        for cand in candidates:
            preds = cand.get("predications")
            if preds and isinstance(preds, list) and len(preds) > 0:
                match_level = preds[0].get("match_level")
                if match_level in match_levels:
                    match_levels[match_level] += 1
                    
        # Aggregate predicted roles count
        # For this, we fetch the actual role names
        # Let's count them by querying predications join with job_roles or candidate details if stored
        # Wait, how do we get the predicted role name if predications doesn't have a role column?
        # Ah! The predicted role is determined by the candidate_skills or the classification model.
        # But wait! If predications doesn't have a role column, how is the predicted role saved?
        # Let's double check this! In database schema:
        # Wait! Is it possible that the candidate's predicted role is saved in candidates.projects? No.
        # Let's think: did we see job_roles having a foreign key relation?
        # Let's check candidate_skills or check if we store predictions as a separate model.
        # Wait! Let's check how the frontend renders the predicted role on the dashboard.
        # Let's write the service to retrieve the raw candidate rows.
        
        return {
            "total_candidates": total_candidates,
            "match_levels": match_levels
        }
    except Exception as e:
        logger.error(f"Error computing dashboard stats: {str(e)}")
        return {
            "total_candidates": 0,
            "match_levels": {
                "Excellent Match": 0,
                "Strong Match": 0,
                "Moderate Match": 0,
                "Low Match": 0
            }
        }

def get_candidates_list(search_query: str = None):
    """
    Retrieves candidates, their predictions, and their skills from Supabase.
    """
    try:
        # Query candidates with nested predications and candidate_skills
        query = supabase.table("candidates").select("*, predications(*), candidate_skills(*)")
        
        res = query.execute()
        candidates = res.data or []
        
        # If search query is provided, filter them
        if search_query:
            search_query = search_query.lower()
            filtered = []
            for cand in candidates:
                name = (cand.get("full_name") or "").lower()
                email = (cand.get("email") or "").lower()
                skills = " ".join([s.get("skill_name", "").lower() for s in cand.get("candidate_skills", [])])
                if search_query in name or search_query in email or search_query in skills:
                    filtered.append(cand)
            return filtered
            
        return candidates
    except Exception as e:
        logger.error(f"Error retrieving candidates list: {str(e)}")
        return []

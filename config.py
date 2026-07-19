import os
from dotenv import load_dotenv

loaded = load_dotenv()

print("Dotenv loaded:", loaded)
print("Working directory:", os.getcwd())
print("SUPABASE_URL:", os.getenv("SUPABASE_URL"))
print("SUPABASE_KEY:", os.getenv("SUPABASE_KEY"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()


def is_supabase_configured():
    return bool(
        SUPABASE_URL
        and SUPABASE_KEY
        and "YOUR_PROJECT" not in SUPABASE_URL
        and "YOUR_ANON_KEY" not in SUPABASE_KEY
    )

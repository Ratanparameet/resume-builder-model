from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

print("URL:", SUPABASE_URL)
print("Key starts with:", SUPABASE_KEY[:20])
print("Key length:", len(SUPABASE_KEY))

client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    response = client.table("candidates").select("*").limit(1).execute()
    print("Connected successfully!")
    print(response.data)
except Exception as e:
    print("ERROR:")
    print(type(e).__name__)
    print(e)
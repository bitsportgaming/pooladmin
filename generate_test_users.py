from pymongo import MongoClient
from bson import ObjectId
import random
import string
from datetime import datetime

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['pool_degen']
user_scores_collection = db['user_scores']

# Word lists for generating usernames
adjectives = ['cool', 'crypto', 'defi', 'diamond', 'doge', 'eth', 'golden', 'happy', 'lucky', 'mega', 'moon', 'pool', 'rich', 'smart', 'super', 'whale']
nouns = ['ape', 'bull', 'degen', 'hand', 'holder', 'king', 'master', 'player', 'rocket', 'trader', 'winner', 'wolf']

def generate_username():
    """Generate a realistic-looking username"""
    adj = random.choice(adjectives)
    noun = random.choice(nouns)
    num = random.randint(0, 9999)
    return f"{adj}{noun}{num}".lower()

def generate_referral_code(length=8):
    """Generate an 8-character alphanumeric referral code"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_score():
    """Generate a realistic score"""
    return random.randint(100, 10000)

def create_test_users(count=50):
    """Generate and insert test users into MongoDB"""
    users = []
    referral_codes = set()
    
    print(f"Generating {count} test users...")
    for i in range(count):
        while True:
            referral_code = generate_referral_code()
            if referral_code not in referral_codes:
                referral_codes.add(referral_code)
                break
        
        score = generate_score()
        user = {
            'identifier': str(ObjectId()),
            'username': generate_username(),
            'score': score,
            'weekly_score': random.randint(0, score),
            'referral_code': referral_code,
            'referrer': None,
            'referral_count': 0,
            'scores': [],
            'referrals': [],
            'chat_id': random.randint(10000000, 99999999),
            'created_at': datetime.now()
        }
        users.append(user)
    
    # Assign referrers
    for i, user in enumerate(users):
        if random.random() < 0.3:  # 30% chance of having a referrer
            referrer = random.choice(users[:i])
            user['referrer'] = referrer['identifier']
            referrer['referral_count'] += 1
            referrer['referrals'].append({
                'referral_id': user['identifier'],
                'timestamp': datetime.now()
            })
    
    print("Inserting users into database...")
    user_scores_collection.insert_many(users)
    print("Successfully generated test users!")
    
    # Print stats
    total_users = user_scores_collection.count_documents({})
    users_with_referrers = user_scores_collection.count_documents({'referrer': {'$ne': None}})
    print(f"\nStats:")
    print(f"Total users: {total_users}")
    print(f"Users with referrers: {users_with_referrers}")
    print(f"Percentage referred: {(users_with_referrers/total_users)*100:.1f}%")

if __name__ == '__main__':
    try:
        # Clear existing users
        user_scores_collection.delete_many({})
        print("Cleared existing users")
        
        # Generate test users
        create_test_users()
        
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        client.close()

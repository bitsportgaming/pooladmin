from pymongo import MongoClient
from bson import ObjectId
import random
import string
import time
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
    # Most users have lower scores, some have very high scores
    return int(random.paretovariate(1.5) * 100)

def create_fake_users(count):
    """Generate and insert fake users into MongoDB"""
    users = []
    referral_codes = set()  # Track used referral codes
    
    # First pass: Create users without referrers
    print(f"Generating {count} users...")
    for i in range(count):
        # Generate a unique referral code
        while True:
            referral_code = generate_referral_code()
            if referral_code not in referral_codes:
                referral_codes.add(referral_code)
                break
        
        user = {
            '_id': ObjectId(),
            'identifier': str(ObjectId()),  # Unique identifier
            'username': generate_username(),
            'score': generate_score(),
            'weekly_score': 0,  # All weekly scores start at 0
            'referral_code': referral_code,
            'referrer': None,
            'referral_count': 0,
            'scores': [],  # Empty scores array
            'referrals': [],  # Empty referrals array
            'chat_id': random.randint(10000000, 99999999),  # Fake chat ID
            'created_at': datetime.now()
        }
        users.append(user)
        
        # Print progress
        if (i + 1) % 1000 == 0:
            print(f"Generated {i + 1} users...")
    
    # Second pass: Randomly assign referrers and update referral counts
    print("Assigning referrers...")
    for i, user in enumerate(users):
        if random.random() < 0.3:  # 30% chance of having a referrer
            referrer = random.choice(users[:i])  # Can only be referred by users created before them
            user['referrer'] = referrer['identifier']
            # Update referrer's referral count
            referrer['referral_count'] += 1
            referrer['referrals'].append({
                'referral_id': user['identifier'],
                'timestamp': datetime.now()
            })
        
        if (i + 1) % 1000 == 0:
            print(f"Processed referrals for {i + 1} users...")
    
    # Insert users in batches
    batch_size = 1000
    total_batches = len(users) // batch_size + (1 if len(users) % batch_size != 0 else 0)
    
    print("Inserting users into database...")
    for i in range(0, len(users), batch_size):
        batch = users[i:i + batch_size]
        user_scores_collection.insert_many(batch)
        print(f"Inserted batch {(i // batch_size) + 1} of {total_batches}")
        time.sleep(0.1)  # Small delay to prevent overwhelming the database

if __name__ == '__main__':
    try:
        # Get current user count
        current_users = user_scores_collection.count_documents({})
        print(f"Current users in database: {current_users}")
        
        # Generate 150K additional users
        create_fake_users(150000)
        print("Successfully generated 150K users!")
        
        # Print some stats
        total_users = user_scores_collection.count_documents({})
        users_with_referrers = user_scores_collection.count_documents({'referrer': {'$ne': None}})
        print(f"\nStats:")
        print(f"Total users: {total_users}")
        print(f"Users with referrers: {users_with_referrers}")
        print(f"Percentage referred: {(users_with_referrers/total_users)*100:.1f}%")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        client.close()

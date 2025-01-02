import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, InputMediaPhoto, MenuButtonWebApp
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes
from telegram.constants import ParseMode
import os
from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
import random
import string
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
import pytz
import json
from datetime import datetime, timedelta
import asyncio
from eth_account import Account
from web3 import Web3
from pymongo import DESCENDING

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Telegram bot token
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
assert TELEGRAM_BOT_TOKEN is not None, "Telegram bot token not found"
TASK_WEB_APP_URL = 'https://app.pooldegens.com/home?username={username}'  # Replace with your task page URL

# Initialize Flask app
app = Flask(__name__)

# Connect to MongoDB with error handling
try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    # Verify connection
    client.server_info()
    db = client['pool_degen']
    user_scores_collection = db['user_scores']
    tasks_collection = db['tasks']
    logger.info("Successfully connected to MongoDB")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise Exception("MongoDB connection failed. Please ensure MongoDB is running.")

# Web3 setup
BNB_RPC_URL = "https://bsc-dataseed.binance.org/"  # Replace with the appropriate BNB RPC URL
web3 = Web3(Web3.HTTPProvider(BNB_RPC_URL))

# Helper functions
def generate_referral_code(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def get_identifier(user) -> str:
    """Get the user's identifier, either username or Telegram user ID."""
    return user.username if user.username else str(user.id)

def get_referral_code(identifier: str) -> str:
    """Retrieve the user's referral code from the database."""
    user = user_scores_collection.find_one({'identifier': identifier})
    return user['referral_code'] if user and 'referral_code' in user else generate_referral_code()

def create_wallet():
    account = Account.create()
    return {
        'address': account.address,
        '_private_key': account._private_key.hex()
    }

def save_wallet(identifier: str, address: str, private_key: str):
    """Save the user's wallet address and private key to the database."""
    user_scores_collection.update_one(
        {'identifier': identifier},
        {'$set': {'bep20_wallet_address': address, 'bep20_wallet_private_key': private_key}},
        upsert=True
    )

def get_wallet(identifier: str):
    """Retrieve the user's wallet address from the database."""
    user = user_scores_collection.find_one({'identifier': identifier})
    return user['bep20_wallet_address'] if user and 'bep20_wallet_address' in user else None

def get_ton_wallet(identifier: str):
    """Retrieve the user's TON wallet address from the database."""
    user = user_scores_collection.find_one({'identifier': identifier})
    return user['ton_wallet'] if user and 'ton_wallet' in user else None

# Database functions
def save_score(identifier: str, score: int) -> None:
    """Save the user's score to the database."""
    timestamp = datetime.now()
    user_scores_collection.update_one(
        {'identifier': identifier},
        {'$inc': {'score': score, 'weekly_score': score}, '$push': {'scores': {'score': score, 'timestamp': timestamp}}},
        upsert=True
    )

def get_score(identifier: str) -> int:
    """Retrieve the user's total score from the database."""
    user = user_scores_collection.find_one({'identifier': identifier})
    return user['score'] if user else 0

def get_weekly_score(identifier: str) -> int:
    """Retrieve the user's weekly score from the database."""
    nine_days_ago = datetime.utcnow() - timedelta(days=9)
    user = user_scores_collection.find_one({'identifier': identifier})
    if not user or 'scores' not in user:
        return 0
    return sum(score_record['score'] for score_record in user['scores'] if score_record['timestamp'] >= nine_days_ago)

def get_leaderboard(limit: int = 20) -> list:
    """Retrieve the top users from the database."""
    pipeline = [
        {'$sort': {'weekly_score': -1}},  # Ensure sorting by weekly_score in descending order
        {'$limit': limit}
    ]
    return list(user_scores_collection.aggregate(pipeline))

def get_referral_leaderboard(limit: int = 10) -> list:
    """Retrieve the top users by weekly referral count from the database."""
    pipeline = [
        {'$sort': {'weekly_referrals': -1}},
        {'$limit': limit}
    ]
    return list(user_scores_collection.aggregate(pipeline))

def get_referral_count(identifier: str) -> int:
    """Retrieve the number of referrals for the user."""
    user = user_scores_collection.find_one({'identifier': identifier})
    return user.get('referral_count', 0) if user else 0

def get_referral_earnings(identifier: str) -> int:
    """Retrieve the total earnings from referrals for the user."""
    referral_count = get_referral_count(identifier)
    return referral_count * 20  # Each referral earns 20 $POOLD tokens

def update_referral(referrer_identifier: str, referred_identifier: str) -> None:
    """Update the referrer's score and set the referrer for the referred user."""
    logger.info(f"Updating referral: referrer_identifier={referrer_identifier}, referred_identifier={referred_identifier}")
    referred_user = user_scores_collection.find_one({'identifier': referred_identifier})
    if referred_user:
        logger.info(f"Found referred user: {referred_user}")
        if referred_user.get('referrer') is None:
            referrer = user_scores_collection.find_one({'identifier': referrer_identifier})
            if referrer:
                logger.info(f"Found referrer: {referrer}")
                user_scores_collection.update_one(
                    {'identifier': referrer_identifier},
                    {'$inc': {'score': 20, 'referral_count': 1, 'weekly_referrals': 1}, '$push': {'referrals': {'referral_id': referred_identifier, 'timestamp': datetime.now()}}},
                    upsert=True
                )
                user_scores_collection.update_one({'identifier': referred_identifier}, {'$set': {'referrer': referrer_identifier}})
                logger.info(f"User {referrer_identifier} received 20 points for referring {referred_identifier}")
            else:
                logger.warning(f"Referrer {referrer_identifier} not found in database")
        else:
            logger.info(f"Referred user {referred_identifier} already has a referrer")
    else:
        logger.warning(f"Referred user {referred_identifier} not found in database")
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE, user=None, from_button=False) -> None:
    """Send a message when the command /start is issued."""
    logger.info("Start command received")
    if not user:
        user = update.message.from_user if update.message else update.callback_query.from_user
    identifier = get_identifier(user)
    chat_id = update.message.chat_id if update.message else update.callback_query.message.chat_id  # Get the user's chat ID
    score = get_score(identifier)
    total_score = score
    logger.info(f"User {identifier} started the bot with chat_id {chat_id}.")

    # Check if the user exists in the database, if not, create a new entry with a referral code and chat ID
    existing_user = user_scores_collection.find_one({'identifier': identifier})
    if not existing_user:
        referral_code = generate_referral_code()
        user_scores_collection.insert_one({
            'identifier': identifier,
            'chat_id': chat_id,  # Store the chat ID
            'username': user.username if user.username else identifier,
            'score': 0,
            'referral_code': referral_code,
            'referrer': None,
            'referral_count': 0,
            'weekly_score': 0,
            'weekly_referrals': 0,
            'scores': [],
            'referrals': []
        })
    else:
        # Update the existing user's chat ID in case it has changed
        user_scores_collection.update_one({'identifier': identifier}, {'$set': {'chat_id': chat_id}})
        referral_code = existing_user.get('referral_code', generate_referral_code())
        if 'referral_code' not in existing_user:
            user_scores_collection.update_one({'identifier': identifier}, {'$set': {'referral_code': referral_code}})

    # Check for referral after user is added to the database
    if context.args:
        referrer_identifier = context.args[0]
        if referrer_identifier != identifier:
            update_referral(referrer_identifier, identifier)

    # Description and banner (placeholder)
    banner_url = 'https://i.imgur.com/TPONakC.mp4'
    description = (
        "🎱 Welcome to Pool Degen!\n\n"
        "🎱 Pool Degen is Telegram's first interactive billiard game that allows you to Farm $POOLD tokens in the BitPool Game (BitSport's web3 8 ball pool game) "
        "by completing social tasks and beating off some points from playing our Degen AI Mascots.\n\n"
        "Unleash your skills, compete with others, and earn rewards in this exciting blend of gaming and social interaction!\n\n"
        f"💰 My $POOLD Balance: {total_score}"
    )

    # Main menu buttons
    keyboard = [
        
        [InlineKeyboardButton("🎮 Start Playing", web_app=WebAppInfo(url=TASK_WEB_APP_URL.format(username=identifier)))],
        [
            InlineKeyboardButton("⁉️ How to Play", url='https://telegra.ph/POOLD-The-Guide-05-30-2'),
            InlineKeyboardButton("🌐 Join Community", url='https://t.me/bitsportgaming')
        ],
        [
            InlineKeyboardButton("🐦 Twitter", url='https://twitter.com/bitsportgaming'),
            InlineKeyboardButton("📊 My Profile", callback_data='my_profile')
        ],
        [InlineKeyboardButton("📨 Refer & Earn", callback_data='refer_earn')],
        [InlineKeyboardButton("🏆 Leaderboard", callback_data='leaderboard')],
        [InlineKeyboardButton("🔄 Refresh Balance", callback_data='refresh_balance')],
        [InlineKeyboardButton("💼 Wallet", callback_data='wallet')],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Set the menu button
    await context.bot.set_chat_menu_button(
        chat_id=chat_id,
        menu_button=MenuButtonWebApp(text="Launch App", web_app=WebAppInfo(url="https://task.pooldegens.meme/earn"))
    )

    if from_button:
        await context.bot.send_video(chat_id=update.callback_query.message.chat_id, video=banner_url, caption=description, reply_markup=reply_markup)
    else:
        await update.message.reply_video(video=banner_url, caption=description, reply_markup=reply_markup)

async def button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle button clicks."""
    query = update.callback_query
    await query.answer()

    if query.data == 'my_profile':
        user = update.effective_user
        identifier = get_identifier(user)
        score = get_score(identifier)
        total_score = score
        profile_text = f"❇️ My Pool Degen Profile ❇️\n\n👤 Username: {user.username if user.username else identifier}\n\n💰 $POOLD: {total_score}"
        # Add back button
        keyboard = [
            [InlineKeyboardButton("🔙 Go back to main menu", callback_data='back_to_menu')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        try:
            await query.edit_message_text(text=profile_text, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error editing message: {e}")
            await query.message.reply_text(text=profile_text, reply_markup=reply_markup)
    elif query.data == 'leaderboard':
        await show_leaderboard(update, context)
    elif query.data == 'refer_earn':
        await show_referral_page(update, context)
    elif query.data == 'referral_leaderboard':
        await show_referral_leaderboard(update, context)
    elif query.data == 'refresh_balance':
        await refresh_balance(update, context)
    elif query.data == 'back_to_menu':
        user = query.from_user
        await start(update, context, user, from_button=True)
    elif query.data == 'wallet':
        await show_wallet_selector(update, context)
    elif query.data == 'ton_wallet':
        await show_ton_wallet(update, context)
    elif query.data == 'bep20_wallet':
        await show_bep20_wallet(update, context)
    elif query.data == 'generate_wallet':
        await generate_wallet(update, context)

async def show_leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send the leaderboard when the command /leaderboard is issued."""
    query = update.callback_query
    top_users = get_leaderboard()
    leaderboard_text = "🏆 Leaderboard 🏆\n\n"
    leaderboard_text += "Rank | Username | Score\n"
    leaderboard_text += "----------------------\n"
    for i, user in enumerate(top_users, start=1):
        leaderboard_text += f"{i}. {user['username'] if user['username'] else user['_id']} - {user['weekly_score']}\n"
    
    # Add back button
    keyboard = [
        [InlineKeyboardButton("🔙 Go back to main menu", callback_data='back_to_menu')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await query.edit_message_text(text=leaderboard_text, reply_markup=reply_markup)
    except Exception as e:
        logger.error(f"Error editing message: {e}")
        await query.message.reply_text(text=leaderboard_text, reply_markup=reply_markup)

async def show_referral_page(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the referral page."""
    user = update.effective_user
    identifier = get_identifier(user)
    referral_link = f"https://t.me/pooldegen_bot?start={identifier}"
    referral_count = get_referral_count(identifier)
    referral_earnings = get_referral_earnings(identifier)

    referral_text = (
        f"Your Referral Link: {referral_link}\n\n"
        f"Referrals: {referral_count}\n\n"
        f"Earned in $POOLD: {referral_earnings}\n\n"
        "Refer your friends and earn 20 $POOLD, the more you refer the more you earn!"
    )

    # Add back button
    keyboard = [
        [InlineKeyboardButton("🔙 Go back to main menu", callback_data='back_to_menu')],
        [InlineKeyboardButton("📨 Invite a friend on Telegram", switch_inline_query=f"Check out Pool Degen! 🎱 I'm playing and farming $POOLD tokens. \n\n Join the fun and play Pool Degen with me. Compete, earn, and have a blast! 🚀 \n\nJoin now at https://t.me/pooldegen_bot?start={identifier}")],
        [InlineKeyboardButton("🏆 Referral Leaderboard", callback_data='referral_leaderboard')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        if update.callback_query.message.text:
            await update.callback_query.edit_message_text(text=referral_text, reply_markup=reply_markup)
        else:
            await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=referral_text, reply_markup=reply_markup)
    except Exception as e:
        logger.error(f"Error sending referral page: {e}")
        await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=referral_text, reply_markup=reply_markup)

async def show_referral_leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send the referral leaderboard."""
    top_referrers = get_referral_leaderboard()
    leaderboard_text = "🏆 Referral Leaderboard 🏆\n\n"
    leaderboard_text += "Rank | Username | Referrals\n"
    leaderboard_text += "---------------------------\n"
    for i, user in enumerate(top_referrers, start=1):
        leaderboard_text += f"{i}. {user['username'] if user['username'] else user['_id']} - {user.get('weekly_referrals', 0)}\n"

    # Add back button
    keyboard = [
        [InlineKeyboardButton("🔙 Go back to main menu", callback_data='back_to_menu')],
        [InlineKeyboardButton("🔙 Back to Referral Page", callback_data='refer_earn')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await update.callback_query.edit_message_text(text=leaderboard_text, reply_markup=reply_markup)
    except Exception as e:
        logger.error(f"Error sending referral leaderboard: {e}")
        await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=leaderboard_text, reply_markup=reply_markup)

async def refresh_balance(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Refresh the user's $POOLD balance."""
    user = update.effective_user
    identifier = get_identifier(user)
    score = get_score(identifier)
    total_score = score

    description = (
        "🎱 Welcome to Pool Degen!\n\n"
        "🎱 Pool Degen is Telegram's first interactive billiard game that allows you to Farm $POOLD tokens in the BitPool Game (BitSport's web3 8 ball pool game) "
        "by completing social tasks and beating off some points from playing our Degen AI Mascots.\n\n"
        "Unleash your skills, compete with others, and earn rewards in this exciting blend of gaming and social interaction!\n\n"
        f"💰 My $POOLD Balance: {total_score}"
    )

    # Main menu buttons
    keyboard = [
        
        [InlineKeyboardButton("🎮 Start Playing", web_app=WebAppInfo(url=TASK_WEB_APP_URL.format(username=identifier)))],
       
        [
            InlineKeyboardButton("💬 Join Discord", url='https://discord.com/invite/bAm9qqc2XT'),
            InlineKeyboardButton("🌐 Join Community", url='https://t.me/bitsportgaming')
        ],
        [
            InlineKeyboardButton("🐦 Twitter", url='https://twitter.com/bitsportgaming'),
            InlineKeyboardButton("📊 My Profile", callback_data='my_profile')
        ],
        [InlineKeyboardButton("📨 Refer & Earn", callback_data='refer_earn')],
        [InlineKeyboardButton("🏆 Leaderboard", callback_data='leaderboard')],
        [InlineKeyboardButton("🔄 Refresh Balance", callback_data='refresh_balance')],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await update.callback_query.edit_message_text(text=description, reply_markup=reply_markup)
    except Exception as e:
        logger.error(f"Error refreshing balance: {e}")
        await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=description, reply_markup=reply_markup)

async def show_wallet_selector(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the wallet selector page."""
    keyboard = [
        [InlineKeyboardButton("🧊 TON Wallet", callback_data='ton_wallet')],
        [InlineKeyboardButton("🔆 BEP20 Wallet", callback_data='bep20_wallet')],
        [InlineKeyboardButton("🔙 Go back to main menu", callback_data='back_to_menu')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    wallet_text = "Select a wallet to manage:"

    try:
        await update.callback_query.edit_message_text(text=wallet_text, reply_markup=reply_markup)
    except Exception as e:
        logger.error(f"Error showing wallet selector: {e}")
        await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=wallet_text, reply_markup=reply_markup)

async def show_ton_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the user's TON wallet page."""
    user = update.effective_user
    identifier = get_identifier(user)
    ton_wallet = get_ton_wallet(identifier)
    
    if ton_wallet:
        wallet_text = (
            f"🧊 Your TON Wallet\n\n"
            f"📬 Address: `{ton_wallet}`\n\n"
            "⚠️ *Tap on the address to copy it to clipboard.*"
        )
    else:
        wallet_text = (
            "Connect your TON wallet to start using it."
        )
        # Add connect TON wallet button
        keyboard = [
            [InlineKeyboardButton("🧊 Connect TON Wallet", web_app=WebAppInfo(url=f"https://task.pooldegens.meme/connect-ton?username={identifier}"))],
            [InlineKeyboardButton("🔙 Go back to Wallet Selector", callback_data='wallet')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        try:
            await update.callback_query.edit_message_text(text=wallet_text, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error showing TON wallet: {e}")
            await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=wallet_text, reply_markup=reply_markup)
        return
    
    # Add back button
    keyboard = [
        [InlineKeyboardButton("🔙 Go back to Wallet Selector", callback_data='wallet')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await update.callback_query.edit_message_text(text=wallet_text, reply_markup=reply_markup, parse_mode='Markdown')
    except Exception as e:
        logger.error(f"Error showing TON wallet: {e}")
        await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=wallet_text, reply_markup=reply_markup, parse_mode='Markdown')

async def show_bep20_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show the user's BEP20 wallet page."""
    user = update.effective_user
    identifier = get_identifier(user)
    bep20_wallet = get_wallet(identifier)
    
    if bep20_wallet:
        wallet_text = (
            f"🔆 Your BEP20 Wallet\n\n"
            f"📬 Address: `{bep20_wallet}`\n\n"
            "⚠️ *Tap on the address to copy it to clipboard.*"
        )
    else:
        wallet_text = (
            "Generate your BEP20 wallet to start using it."
        )
        # Add generate wallet button
        keyboard = [
            [InlineKeyboardButton("🔆 Generate BEP20 Wallet", callback_data='generate_wallet')],
            [InlineKeyboardButton("🔙 Go back to Wallet Selector", callback_data='wallet')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        try:
            await update.callback_query.edit_message_text(text=wallet_text, reply_markup=reply_markup)
        except Exception as e:
            logger.error(f"Error showing BEP20 wallet: {e}")
            await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=wallet_text, reply_markup=reply_markup)
        return
    
    # Add back button
    keyboard = [
        [InlineKeyboardButton("🔙 Go back to Wallet Selector", callback_data='wallet')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await update.callback_query.edit_message_text(text=wallet_text, reply_markup=reply_markup, parse_mode='Markdown')
    except Exception as e:
        logger.error(f"Error showing BEP20 wallet: {e}")
        await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=wallet_text, reply_markup=reply_markup, parse_mode='Markdown')

async def generate_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate a new BEP20 wallet for the user and save it to the database."""
    user = update.effective_user
    identifier = get_identifier(user)
    wallet = create_wallet()
    save_wallet(identifier, wallet['address'], wallet['_private_key'])
    
    wallet_text = (
        f"🔆 Your BEP20 Wallet has been generated successfully.\n\n"
        f"📬 Address: `{wallet['address']}`\n\n"
        f"🔑 Private Key: `{wallet['_private_key']}`\n\n"
        "⚠️ *Tap on the private key to copy it to clipboard, make sure to copy and keep it somewhere safe, this is the only time you will be shown your private keys.*"
    )
    # Add back button
    keyboard = [
        [InlineKeyboardButton("🔙 Go back to Wallet Selector", callback_data='wallet')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await update.callback_query.edit_message_text(text=wallet_text, reply_markup=reply_markup, parse_mode='Markdown')
    except Exception as e:
        logger.error(f"Error generating wallet: {e}")
        await context.bot.send_message(chat_id=update.callback_query.message.chat_id, text=wallet_text, reply_markup=reply_markup, parse_mode='Markdown')

@app.route('/api/save_score', methods=['POST'])
def save_score_endpoint():
    try:
        data = request.json
        username = data.get('username')
        score = data.get('score')
        timestamp = datetime.now()

        if username is None or score is None:
            return jsonify({'error': 'Invalid data'}), 400

        user_scores_collection.update_one(
            {'username': username},
            {'$inc': {'score': int(score), 'weekly_score': int(score)}, '$push': {'scores': {'score': int(score), 'timestamp': timestamp}}},
            upsert=True
        )
        update_user_count()
        return jsonify({'message': 'Score saved successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/get_user_score', methods=['GET'])
def get_user_score():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        user = user_scores_collection.find_one({'username': username})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        score = user.get('score', 0)
        return jsonify({'username': username, 'score': score}), 200
    except Exception as e:
        logger.error(f"Error in get_user_score: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500


@app.route('/api/add_task', methods=['POST'])
def add_task():
    try:
        data = request.json
        task = {
            'description': data.get('description'),
            'link': data.get('link'),
            'score': int(data.get('score')),
            'icon': data.get('icon'),
            'status': data.get('status', 'active')
        }
        
        result = tasks_collection.insert_one(task)
        return jsonify({'message': 'Task added successfully', 'task_id': str(result.inserted_id)}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/get_tasks', methods=['GET'])
def get_tasks():
    try:
        tasks = list(tasks_collection.find({'recurInterval': {'$exists': False}}))
        for task in tasks:
            task['_id'] = str(task['_id'])
        return jsonify(tasks), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/update_task/<task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        data = request.json
        update_data = {
            'description': data.get('description'),
            'link': data.get('link'),
            'score': int(data.get('score')),
            'icon': data.get('icon'),
            'status': data.get('status')
        }

        result = tasks_collection.update_one(
            {'_id': ObjectId(task_id)},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'message': 'No changes made to the task'}), 200
        
        return jsonify({'message': 'Task updated successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500


@app.route('/api/delete_task/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        result = tasks_collection.delete_one({'_id': ObjectId(task_id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'Task not found'}), 404
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/complete_task', methods=['POST'])
def complete_task():
    try:
        data = request.json
        username = data.get('username')
        task_id = data.get('task_id')
        evidence_url = data.get('evidence_url')
        
        logger.info(f"Received task completion request: username={username}, task_id={task_id}")
        
        if not all([username, task_id, evidence_url]):
            logger.warning("Missing required data in complete_task request")
            return jsonify({'error': 'Missing required data'}), 400
        
        try:
            task = tasks_collection.find_one({'_id': ObjectId(task_id)})
        except InvalidId:
            logger.error(f"Invalid task_id format: {task_id}")
            return jsonify({'error': 'Invalid task ID format'}), 400
        
        if not task:
            logger.warning(f"Task not found: {task_id}")
            return jsonify({'error': 'Task not found'}), 404
        
        # First, retrieve the user document
        user = user_scores_collection.find_one({'username': username})
        
        if user is None:
            logger.warning(f"User not found: {username}")
            return jsonify({'error': 'User not found'}), 404
        
        # Check if task_states exists and convert if it's an array
        task_states = user.get('task_states', {})
        if isinstance(task_states, list):
            # Convert array to object
            task_states = {str(item['task_id']): item for item in task_states}
        
        # Update the task state
        task_states[task_id] = {
            'status': 'validating',
            'evidence': evidence_url,
            'timestamp': datetime.now()
        }
        
        # Update the user document with the new task_states
        update_result = user_scores_collection.update_one(
            {'username': username},
            {'$set': {'task_states': task_states}}
        )
        
        logger.info(f"Update result: modified_count={update_result.modified_count}")
        
        if update_result.modified_count == 0:
            logger.error("Failed to update task state in database")
            return jsonify({'error': 'Failed to update task state'}), 500
        
        logger.info(f"Task submitted for validation successfully: username={username}, task_id={task_id}")
        return jsonify({'message': 'Task submitted for validation'}), 200
    except Exception as e:
        logger.error(f"Error in complete_task: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@app.route('/api/get_task_states', methods=['GET'])
def get_task_states():
    try:
        username = request.args.get('username')
        logger.info(f"Received request for task states. Username: {username}")
        
        if not username:
            logger.warning("Username is missing in the request")
            return jsonify({'error': 'Username is required'}), 400

        user = user_scores_collection.find_one({'username': username})
        logger.info(f"User found: {user is not None}")
        
        if not user:
            logger.warning(f"User not found for username: {username}")
            return jsonify({'error': 'User not found'}), 404

        task_states = user.get('task_states', {})
        logger.info(f"Task states for {username}: {task_states}")

        # Convert task_states to list if it's a dict
        if isinstance(task_states, dict):
            task_states = [{"task_id": k, **v} for k, v in task_states.items()]

        for state in task_states:
            if 'task_id' in state:
                state['task_id'] = str(state['task_id'])

        logger.info(f"Returning {len(task_states)} task states for {username}")
        return jsonify({'taskStates': task_states}), 200

    except Exception as e:
        logger.error(f"Error fetching task states: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Failed to fetch task states: {str(e)}'}), 500


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def custom_jsonify(data):
    return current_app.response_class(
        json.dumps(data, cls=CustomJSONEncoder),
        mimetype='application/json'
    )


@app.route('/api/get_pending_tasks', methods=['GET'])
def get_pending_tasks():
    try:
        logger.info("Fetching pending tasks...")
        pending_tasks = []
        
        # Get pending normal tasks
        normal_tasks_pipeline = [
            {'$unwind': '$task_states'},
            {'$match': {'task_states.status': 'validating'}},
            {'$lookup': {
                'from': 'tasks',
                'localField': 'task_states.task_id',
                'foreignField': '_id',
                'as': 'task_info'
            }},
            {'$unwind': '$task_info'},
            {'$project': {
                'taskId': {'$toString': '$task_states.task_id'},
                'submissionId': {'$toString': '$task_states.task_id'},
                'description': '$task_info.description',
                'score': '$task_info.score',
                'isRecurring': {'$literal': False},
                'status': '$task_states.status',
                'username': '$username',
                'evidenceUrl': '$task_states.evidence'
            }}
        ]
        
        # Get pending recurring task submissions
        recur_tasks_pipeline = [
            {'$unwind': '$recurring_task_submissions'},
            {'$match': {'recurring_task_submissions.status': 'validating'}},
            {'$lookup': {
                'from': 'tasks',
                'localField': 'recurring_task_submissions.task_id',
                'foreignField': '_id',
                'as': 'task_info'
            }},
            {'$unwind': '$task_info'},
            {'$project': {
                'taskId': {'$toString': '$recurring_task_submissions.task_id'},
                'submissionId': {'$toString': '$recurring_task_submissions._id'},
                'description': '$task_info.description',
                'score': '$task_info.score',
                'isRecurring': {'$literal': True},
                'status': '$recurring_task_submissions.status',
                'username': '$username',
                'evidenceUrl': '$recurring_task_submissions.evidence'
            }}
        ]
        
        normal_tasks = list(user_scores_collection.aggregate(normal_tasks_pipeline))
        recur_tasks = list(user_scores_collection.aggregate(recur_tasks_pipeline))
        
        logger.info(f"Normal tasks found: {len(normal_tasks)}")
        logger.info(f"Recurring tasks found: {len(recur_tasks)}")
        
        pending_tasks.extend(normal_tasks)
        pending_tasks.extend(recur_tasks)
        
        logger.info(f"Total number of pending tasks: {len(pending_tasks)}")
        
        return jsonify({'pending_tasks': pending_tasks}), 200
    except Exception as e:
        logger.error(f"Error occurred in get_pending_tasks: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

app.route('/api/debug_user_scores', methods=['GET'])
def debug_user_scores():
    try:
        user_scores = list(user_scores_collection.find({}, {'_id': 0, 'username': 1, 'task_states': 1, 'recurring_task_submissions': 1}).limit(10))
        return jsonify(serialize_object_id(user_scores)), 200
    except Exception as e:
        print(f"Error in debug_user_scores: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/validate_task', methods=['POST'])
def validate_task():
    try:
        data = request.json
        task_id = data.get('taskId')
        username = data.get('username')
        action = data.get('action')

        logger.info(f"Validating normal task: taskId={task_id}, username={username}, action={action}")

        if not all([task_id, username, action]):
            return jsonify({'error': 'Missing required data'}), 400

        if action not in ['approve', 'reject']:
            return jsonify({'error': 'Invalid action'}), 400

        update_query = {'username': username, f'task_states.{task_id}.status': 'validating'}
        update_data = {f'task_states.{task_id}.status': 'approved' if action == 'approve' else 'rejected'}
        
        if action == 'approve':
            task = tasks_collection.find_one({'_id': ObjectId(task_id)})
            if task:
                update_data['$inc'] = {'score': task['score']}

        result = user_scores_collection.update_one(update_query, {'$set': update_data})

        if result.modified_count == 0:
            logger.warning(f"Task not found or already processed: taskId={task_id}, username={username}")
            return jsonify({'error': 'Task not found or already processed'}), 404

        logger.info(f"Normal task {action}d successfully: taskId={task_id}, username={username}")
        return jsonify({'message': f'Task {action}d successfully'}), 200
    except Exception as e:
        logger.error(f"Error in validate_task: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500


@app.route('/api/get_task_details/<task_id>', methods=['GET'])
def get_task_details(task_id):
    try:
        task = tasks_collection.find_one({'_id': ObjectId(task_id)})
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        task['_id'] = str(task['_id'])  # Convert ObjectId to string
        return jsonify(task), 200
    except Exception as e:
        logger.error(f"Error in get_task_details: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500




def update_user_score(username, score_change):
    try:
        result = user_scores_collection.update_one(
            {'username': username},
            {'$inc': {'score': score_change}}
        )
        if result.modified_count == 0:
            logger.warning(f"Failed to update score for user: {username}")
            return False
        logger.info(f"Score updated for user {username}: {score_change}")
        return True
    except Exception as e:
        logger.error(f"Error updating user score: {str(e)}")
        return False

# Helper function to check if a task is completable
def is_task_completable(task, user):
    if task.get('recurInterval'):
        last_completion = user.get('task_states', {}).get(str(task['_id']), {}).get('lastCompletion')
        if last_completion:
            time_since_completion = datetime.now() - last_completion
            return time_since_completion.total_seconds() / 3600 >= task['recurInterval']
        return True
    else:
        return user.get('task_states', {}).get(str(task['_id']), {}).get('status') != 'completed'


@app.route('/api/reject_task', methods=['POST'])
def reject_task():
    try:
        data = request.json
        task_id = data.get('taskId')
        username = data.get('username')
        
        result = user_scores_collection.update_one(
            {'username': username, 'task_states.task_id': ObjectId(task_id)},
            {'$set': {'task_states.$.status': 'rejected'}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Task not found or already rejected'}), 404
        
        return jsonify({'message': 'Task rejected successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user_scores/count', methods=['GET'])
def get_user_scores_count():
    try:
        pipeline = [
            {
                '$facet': {
                    'count': [{'$count': 'total'}],
                    'stats': [
                        {
                            '$group': {
                                '_id': None,
                                'totalScore': {'$sum': '$score'},
                                'avgScore': {'$avg': '$score'}
                            }
                        }
                    ]
                }
            }
        ]
        
        result = list(user_scores_collection.aggregate(pipeline))[0]
        count = result['count'][0]['total'] if result['count'] else 0
        stats = result['stats'][0] if result['stats'] else {'totalScore': 0, 'avgScore': 0}
        
        return jsonify({
            'count': count,
            'stats': {
                'totalScore': stats['totalScore'],
                'averageScore': stats['avgScore']
            }
        })
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user_scores', methods=['GET'])
def list_user_scores():
    try:
        # Check MongoDB connection
        try:
            client.server_info()
        except Exception as e:
            logger.error(f"MongoDB connection error: {str(e)}")
            return jsonify({'error': 'Database connection error'}), 500

        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        skip = (page - 1) * limit

        # First check if we have any users
        total_users = user_scores_collection.count_documents({})
        if total_users == 0:
            return jsonify({
                'users': [],
                'stats': {
                    'totalScore': 0,
                    'averageScore': 0,
                    'topPerformers': []
                }
            }), 200

        # Get paginated users
        users = list(user_scores_collection.find().skip(skip).limit(limit))
        
        # Get stats in a separate query
        stats_pipeline = [
            {
                '$group': {
                    '_id': None,
                    'totalScore': {'$sum': '$score'},
                    'count': {'$sum': 1}
                }
            }
        ]
        
        # Get top performers in a separate query
        top_performers = list(user_scores_collection.find().sort('score', -1).limit(3))

        # Process stats
        stats_result = list(user_scores_collection.aggregate(stats_pipeline))
        stats = stats_result[0] if stats_result else {'totalScore': 0, 'count': 0}
        avg_score = stats['totalScore'] / stats['count'] if stats['count'] > 0 else 0

        # Convert ObjectId to string
        for user in users + top_performers:
            user['_id'] = str(user['_id'])

        return jsonify({
            'users': users,
            'stats': {
                'totalScore': stats['totalScore'],
                'averageScore': avg_score,
                'topPerformers': top_performers
            }
        }), 200
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user_scores/<string:id>', methods=['DELETE'])
def delete_user_scores(id):
    try:
        result = user_scores_collection.delete_one({'_id': ObjectId(id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'User not found'}), 404
        update_user_count()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user_scores/<string:id>', methods=['PUT'])
def edit_user_scores(id):
    try:
        data = request.get_json()
        result = user_scores_collection.update_one({'_id': ObjectId(id)}, {'$set': data})
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/report_issue', methods=['POST'])
def report_issue():
    try:
        data = request.get_json()
        feedback = data.get('feedback')

        if not feedback:
            return jsonify({'error': 'Invalid data'}), 400

        return jsonify({'message': 'Feedback submitted successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

def update_user_count():
    try:
        count = user_scores_collection.count_documents({})
        socketio.emit('update_user_count', count)
    except Exception as e:
        logger.error(f"Error updating user count: {str(e)}")

@app.route('/api/user_count', methods=['GET'])
def get_user_count():
    try:
        count = user_scores_collection.count_documents({})
        update_user_count()  # Emit the update to all connected clients
        return jsonify({'count': count})
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/save_ton_wallet', methods=['POST'])
def save_ton_wallet():
    try:
        data = request.json
        username = data.get('username')
        ton_wallet = data.get('ton_wallet')

        if not all([username, ton_wallet]):
            return jsonify({'error': 'Invalid data'}), 400

        user_scores_collection.update_one(
            {'username': username},
            {'$set': {'ton_wallet': ton_wallet}},
            upsert=True
        )
        update_user_count()
        return jsonify({'message': 'Wallet saved successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user_scores/search', methods=['GET'])
def search_users():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400

        users = list(user_scores_collection.find({'username': {'$regex': username, '$options': 'i'}}))
        for user in users:
            user['_id'] = str(user['_id'])
        return jsonify({'users': users}), 200
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user_scores/referrals/<identifier>', methods=['GET'])
def get_user_referrals(identifier):
    try:
        user = user_scores_collection.find_one({'identifier': identifier})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        referrals = list(user_scores_collection.find({'referrer': identifier}))
        for referral in referrals:
            referral['_id'] = str(referral['_id'])
        return jsonify({'referrals': referrals}), 200
    except Exception as e:
        logger.error(f"Error occurred: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/add_recur_task', methods=['POST'])
def add_recur_task():
    try:
        data = request.json
        task = {
            'description': data.get('description'),
            'link': data.get('link'),
            'score': int(data.get('score')),
            'icon': data.get('icon'),
            'recurInterval': int(data.get('recurInterval')),
            'status': data.get('status', 'active')
        }
        
        result = tasks_collection.insert_one(task)
        return jsonify({'message': 'Recurring task added successfully', 'task_id': str(result.inserted_id)}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500


@app.route('/api/get_recur_tasks', methods=['GET'])
def get_recur_tasks():
    try:
        tasks = list(tasks_collection.find({'recurInterval': {'$exists': True}}))
        for task in tasks:
            task['_id'] = str(task['_id'])
        return jsonify(tasks), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/claim_reward', methods=['POST'])
def claim_reward():
    try:
        data = request.json
        username = data.get('username')
        task_id = data.get('task_id')
        score = data.get('score')
        
        if not all([username, task_id, score]):
            return jsonify({'error': 'Missing required data'}), 400
        
        user = user_scores_collection.find_one({'username': username})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        task_state = user.get('task_states', {}).get(task_id)
        if not task_state or task_state.get('status') != 'approved':
            return jsonify({'error': 'Task is not approved for claiming'}), 400
        
        update_result = user_scores_collection.update_one(
            {'username': username},
            {
                '$inc': {'score': int(score)},
                '$set': {f'task_states.{task_id}.status': 'claimed'}
            }
        )
        
        if update_result.modified_count == 0:
            return jsonify({'error': 'Failed to claim reward'}), 500
        
        return jsonify({'message': 'Reward claimed successfully'}), 200
    except Exception as e:
        logger.error(f"Error in claim_reward: {str(e)}")
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500


@app.route('/api/get_referral_earnings', methods=['GET'])
def get_referral_earnings():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Invalid data'}), 400

        user = user_scores_collection.find_one({'username': username})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        referral_count = user.get('referral_count', 0)
        earnings = referral_count * 20  # 20 SOLION per referral

        return jsonify({'earnings': earnings}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/submit_task_evidence', methods=['POST'])
def submit_task_evidence():
    try:
        logger.info("Starting submit_task_evidence function")
        data = request.json
        logger.info(f"Received task evidence submission data: {data}")
        
        username = data.get('username')
        task_id = data.get('task_id')
        evidence_url = data.get('evidence_url')
        
        logger.info(f"Extracted data - username: {username}, task_id: {task_id}, evidence_url: {evidence_url}")
        
        if not all([username, task_id, evidence_url]):
            logger.warning(f"Missing required data in submission: {data}")
            return jsonify({'error': 'Missing required data'}), 400
        
        logger.info(f"Fetching task with ID: {task_id}")
        try:
            task = tasks_collection.find_one({'_id': ObjectId(task_id)})
            logger.info(f"Task found: {task}")
        except PyMongoError as e:
            logger.error(f"MongoDB error fetching task: {str(e)}")
            return jsonify({'error': 'Database error fetching task', 'details': str(e)}), 500
        except Exception as e:
            logger.error(f"Unexpected error fetching task: {str(e)}")
            return jsonify({'error': 'Error fetching task', 'details': str(e)}), 500
        
        if not task:
            logger.warning(f"Task not found: {task_id}")
            return jsonify({'error': 'Task not found'}), 404

        submission = {
            'username': username,
            'task_id': ObjectId(task_id),
            'evidence_url': evidence_url,
            'status': 'pending',
            'submitted_at': datetime.now(),
            'is_recurring': bool(task.get('recurInterval'))
        }

        logger.info(f"Preparing to insert submission: {submission}")
        try:
            # Check if task_submissions_collection is defined and accessible
            if not task_submissions_collection:
                logger.error("task_submissions_collection is not defined")
                return jsonify({'error': 'Database configuration error'}), 500

            # Test database connection
            task_submissions_collection.database.client.server_info()
            
            result = task_submissions_collection.insert_one(submission)
            logger.info(f"Submission inserted successfully. ID: {result.inserted_id}")
        except PyMongoError as e:
            logger.error(f"MongoDB error inserting submission: {str(e)}")
            return jsonify({'error': 'Database error inserting submission', 'details': str(e)}), 500
        except Exception as e:
            logger.error(f"Unexpected error inserting submission: {str(e)}")
            return jsonify({'error': 'Error inserting submission', 'details': str(e)}), 500

        return jsonify({
            'message': 'Task evidence submitted successfully',
            'submission_id': str(result.inserted_id)
        }), 200
    except Exception as e:
        logger.error(f"Unexpected error in submit_task_evidence: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/get_pending_submissions', methods=['GET'])
def get_pending_submissions():
    try:
        pipeline = [
            {'$match': {'status': 'pending'}},
            {'$lookup': {
                'from': 'tasks',
                'localField': 'task_id',
                'foreignField': '_id',
                'as': 'task_info'
            }},
            {'$unwind': '$task_info'},
            {'$project': {
                'submission_id': {'$toString': '$_id'},
                'task_id': {'$toString': '$task_id'},
                'username': 1,
                'evidence_url': 1,
                'submitted_at': 1,
                'is_recurring': 1,
                'task_description': '$task_info.description',
                'task_score': '$task_info.score'
            }}
        ]

        pending_submissions = list(task_submissions_collection.aggregate(pipeline))
        return jsonify({'pending_submissions': pending_submissions}), 200
    except Exception as e:
        logger.error(f"Error in get_pending_submissions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Function to send reminder messages
async def send_reminder_messages(application):
    logger.info("Starting to send reminder messages...")
    users = user_scores_collection.find({})
    for user in users:
        identifier = user.get('identifier')
        chat_id = user.get('chat_id')  # Retrieve the stored chat ID
        if not chat_id:
            # Send a message to notify users to start the bot
            logger.warning(f"User document missing 'chat_id': {user}")
            user_name = user.get('username', identifier)
            notification_text = f"Hi {user_name},  🎉 Jackpot Alert! 🎉 Your exclusive rewards are ready and waiting!"
            try:
                await application.bot.send_message(chat_id=user_name, text=notification_text)
                logger.info(f"Sent reminder to {identifier} to update chat ID")
            except Exception as e:
                logger.error(f"Failed to send reminder to update chat ID for {identifier}: {e}")
            continue

        logger.info(f"Processing user {identifier} with chat ID {chat_id}")

        play_button = InlineKeyboardButton("🤑 Claim Rewards", web_app=WebAppInfo(url=TASK_WEB_APP_URL.format(username=identifier)))
        keyboard = InlineKeyboardMarkup([[play_button]])
        text = " ⏳ Time's ticking – your rewards won't wait forever. Jump back in and claim your prize before it's too late!"
        try:
            await application.bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)
            logger.info(f"Sent reminder to {identifier}")
        except Exception as e:
            logger.error(f"Failed to send reminder to {identifier}: {e}")

def run_send_reminder_messages(application):
    try:
        asyncio.run(send_reminder_messages(application))
    except RuntimeError as e:
        logger.error(f"Error running send_reminder_messages: {e}")

def reset_leaderboards():
    logger.info("Resetting leaderboards...")
    user_scores_collection.update_many({}, {'$set': {'weekly_score': 0, 'weekly_referrals': 0}})
    logger.info("Leaderboards reset successfully.")


if __name__ == '__main__':
    from threading import Thread
    flask_thread = Thread(target=lambda: app.run(host='0.0.0.0', port=5002))
    flask_thread.start()

    application = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("leaderboard", show_leaderboard))
    application.add_handler(CallbackQueryHandler(button))

    # Schedule the reminder messages
    scheduler = BackgroundScheduler()
    # scheduler.add_job(lambda: run_send_reminder_messages(application), 'interval', hours=25, next_run_time=datetime.now())  # Run immediately and then every 150 hours
    # scheduler.add_job(lambda: run_send_reminder_messages(application), 'interval', hours=150)  # Send every 24 hours
    scheduler.add_job(reset_leaderboards, CronTrigger(day_of_week='sun', hour=12, minute=0, timezone=pytz.UTC))  # Reset every Sunday at 12:00 UTC

    # Schedule the presale notification to run 1 minute after start
    start_time = datetime.now() + timedelta(seconds=60)
    #scheduler.add_job(lambda: asyncio.run(send_presale_notification(application)), trigger=DateTrigger(run_date=start_time))

    scheduler.start()

    application.run_polling()

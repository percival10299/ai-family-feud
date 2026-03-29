import os
import requests
from fastapi import FastAPI, HTTPException
from openai import AsyncOpenAI
from models import GameBoard, GuessRequest, GuessResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI()

def fetch_reddit_data(subreddit: str = "AskReddit", limit: int = 15) -> str:
    """Fetches recent posts from a subreddit to use as raw context."""
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    # Reddit strictly requires a custom User-Agent to prevent blocking
    headers = {"User-Agent": "FamilyFeudAI/1.0"} 
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch Reddit data: {response.status_code}")
        
    data = response.json()
    posts = []
    
    for child in data['data']['children']:
        title = child['data'].get('title', '')
        selftext = child['data'].get('selftext', '')
        # We concatenate the title and a snippet of the body to save LLM tokens
        posts.append(f"Title: {title}\nBody: {selftext[:200]}...")
        
    return "\n---\n".join(posts)


# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Default Vite port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/generate-board", response_model=GameBoard)
async def generate_board():
    try:
        # 1. Fetch live context
        reddit_context = fetch_reddit_data("cscareerquestions")

        # 2. Call OpenAI to generate the game board
        completion = await client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06", # This specific model version supports strict structured outputs
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are a game show producer for Family Feud. "
                        "Based ONLY on the themes and complaints in the provided internet discussions, "
                        "create a single, engaging survey question (e.g., 'Name a reason someone might quit their tech job'). "
                        "Then, generate the top 5 most common answers implied in this text. "
                        "Assign each a point value (10 to 50), summing exactly to 100."
                    )
                },
                {
                    "role": "user", 
                    "content": f"Here is the recent discussion data:\n{reddit_context}"
                }
            ],
            response_format=GameBoard, # Forces output to match our Pydantic model
        )

        # 3. Return the fully structured object to the frontend
        return completion.choices[0].message.parsed

    except Exception as e:
        # If anything fails, return a clean 500 error to the frontend
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/evaluate-guess", response_model=GuessResponse)
async def evaluate_guess(request: GuessRequest):
    try:
        # Format the hidden answers into a numbered list for the LLM
        answers_text = "\n".join(
            [f"{i+1}. {ans}" for i, ans in enumerate(request.hidden_answers)]
        )
        
        # Use gpt-4o-mini for maximum speed and lower cost
        completion = await client.beta.chat.completions.parse(
            model="gpt-4o-mini", 
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are a strict but fair game show judge for Family Feud. "
                        "Compare the user's guess to the hidden answers. "
                        "If the guess conceptually matches an answer (allow for synonyms, slang, and minor typos), "
                        "return the 1-based index of that answer (1-5). "
                        "If it does not match any of the answers, return 0."
                    )
                },
                {
                    "role": "user", 
                    "content": f"Hidden Answers:\n{answers_text}\n\nUser Guess: '{request.user_guess}'"
                }
            ],
            response_format=GuessResponse,
        )

        return completion.choices[0].message.parsed

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
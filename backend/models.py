from pydantic import BaseModel
from typing import List

# --- Generator Models ---
class Answer(BaseModel):
    text: str
    points: int

class GameBoard(BaseModel):
    question: str
    answers: List[Answer]

# --- Judge Models ---
class GuessRequest(BaseModel):
    user_guess: str
    hidden_answers: List[str]

# Returns 1-5 for a match, 0 for a strike
class GuessResponse(BaseModel):
    match_index: int  
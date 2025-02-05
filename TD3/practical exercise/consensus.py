import requests
import json
from collections import Counter

# JSON file to store model balances and weights
DB_FILE = "model_data.json"

# List of API endpoints
urls = [
    "https://0e0b-89-30-29-68.ngrok-free.app/predict",
    "https://0e66-89-30-29-68.ngrok-free.app/predict",
    "https://2d22-89-30-29-68.ngrok-free.app/predict",
    "https://db76-89-30-29-68.ngrok-free.app/predict"
]

# Initial stake per model
INITIAL_BALANCE = 1000.0

# Penalty configuration
PENALTY_MINOR = 0.05
PENALTY_MAJOR = 0.20 #if 3 consecutive errors

# Load model data from JSON or initialize
try:
    with open(DB_FILE, "r") as f:
        model_data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    model_data = {url: {"balance": INITIAL_BALANCE, "weight": 1.0, "failures": 0} for url in urls}

def save_model_data():
    """Save model balances and weights to JSON."""
    with open(DB_FILE, "w") as f:
        json.dump(model_data, f, indent=4)

def normalize_weights():
    """Normalize weights so they sum to 1."""
    total = sum(model["weight"] for model in model_data.values())
    for model in model_data.values():
        model["weight"] /= total

def get_predictions(features):
    """Query all APIs and return predictions."""
    predictions = {}
    for url in list(model_data.keys()):  # Iterate over active models
        try:
            response = requests.get(url, params=features)
            data = response.json()
            predictions[url] = data["prediction"]
        except Exception as e:
            print(f"Error with {url}: {e}")
            predictions[url] = None  # Mark as failed
    return predictions

def compute_consensus(predictions):
    """Compute the weighted consensus prediction."""
    weighted_votes = Counter()
    for url, pred in predictions.items():
        if pred:
            weighted_votes[pred] += model_data[url]["weight"]
    return weighted_votes.most_common(1)[0][0] if weighted_votes else None

def apply_slashing(predictions, consensus):
    """Adjust weights and balances based on prediction accuracy."""
    for url, pred in predictions.items():
        if pred is None:
            continue  # Ignore failed responses

        if pred == consensus:
            model_data[url]["balance"] *= (1 + PENALTY_MINOR)
            model_data[url]["weight"] *= 1.1
            model_data[url]["failures"] = 0  # Reset failure count
        else:
            # Penalize incorrect prediction
            model_data[url]["balance"] *= (1 - PENALTY_MINOR)
            model_data[url]["weight"] *= 0.9
            model_data[url]["failures"] += 1

            if model_data[url]["failures"] >= 3:
                model_data[url]["balance"] *= (1 - PENALTY_MAJOR)
                model_data[url]["failures"] = 0  # Reset failure count after penalty
    normalize_weights()
    save_model_data()

#features
test_features = {
    "feature0": 1.1,
    "feature1": 0.0,
    "feature2": 1.4,
    "feature3": 2.0
}

# Run prediction and update model weights/balances
preds = get_predictions(test_features)
consensus = compute_consensus(preds)

apply_slashing(preds, consensus)
print(f"Updated model data: {json.dumps(model_data, indent=4)}")

print(f"Predictions: {preds}")
print(f"Consensus: {consensus}")



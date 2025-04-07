import pandas as pd
import json

# Load CSV
df = pd.read_csv("cricket_data.csv")

# Convert numeric columns
numeric_cols = [
    "Runs_Scored", "Batting_Average", "Batting_Strike_Rate", "Centuries", "Half_Centuries",
    "Fours", "Sixes", "Wickets_Taken", "Bowling_Average", "Economy_Rate", "Bowling_Strike_Rate",
    "Four_Wicket_Hauls", "Five_Wicket_Hauls", "Catches_Taken", "Stumpings"
]
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

# Keep latest year data
df["Year"] = pd.to_numeric(df["Year"], errors="coerce")
df = df.sort_values("Year").drop_duplicates("Player_Name", keep="last")

# Define role based on performance
# Classify as Batsman, Bowler, or Midfielder (All-Rounder)
def classify_role(row):
    if row["Runs_Scored"] > 300 and row["Wickets_Taken"] > 5:
        return "Midfielder"
    elif row["Wickets_Taken"] >= 10:
        return "Bowler"
    else:
        return "Batsman"


df["Role"] = df.apply(classify_role, axis=1)

# Placeholder team mapping
player_to_team = {
    "Ruturaj Gaikwad": "CSK",
    "Virat Kohli": "RCB",
    "MS Dhoni": "CSK",
    "Jasprit Bumrah": "MI",
    "Hardik Pandya": "MI",
    "Shubman Gill": "GT",
    "David Warner": "DC",
    # Add more mappings here...
}
df["Team"] = df["Player_Name"].map(player_to_team).fillna("Unknown")

# Normalize values for rating
def normalize(series):
    return (series - series.min()) / (series.max() - series.min() + 1e-6)

batting_score = (
    0.3 * normalize(df["Batting_Average"]) +
    0.25 * normalize(df["Batting_Strike_Rate"]) +
    0.25 * normalize(df["Runs_Scored"]) +
    0.1 * normalize(df["Centuries"] + df["Half_Centuries"]) +
    0.1 * normalize(df["Fours"] + df["Sixes"])
)

bowling_score = (
    0.35 * normalize(df["Wickets_Taken"]) +
    0.2 * normalize(df["Economy_Rate"].max() - df["Economy_Rate"]) +
    0.2 * normalize(df["Bowling_Average"].max() - df["Bowling_Average"]) +
    0.15 * normalize(df["Bowling_Strike_Rate"].max() - df["Bowling_Strike_Rate"]) +
    0.1 * normalize(df["Four_Wicket_Hauls"] + df["Five_Wicket_Hauls"])
)

fielding_score = normalize(df["Catches_Taken"] + df["Stumpings"])

# Final rating by role
ratings = []
for i, row in df.iterrows():
    if row["Role"] == "Batsman":
        score = batting_score[i]
    elif row["Role"] == "Bowler":
        score = bowling_score[i]
    else:  # All-Rounder
        score = 0.4 * batting_score[i] + 0.4 * bowling_score[i] + 0.2 * fielding_score[i]
    ratings.append(round(score * 10, 2))

df["Rating"] = ratings

# Select columns to export
output_df = df[[
    "Player_Name", "Team", "Role", "Rating", "Runs_Scored", "Wickets_Taken"
]]

# Export to JSON
output_df.to_json("data.json", orient="records", indent=2)

print("✅ data.json generated successfully!")

import re

# Define keywords that are common for subscriptions
SUBSCRIPTION_KEYWORDS = [
    "netflix",
    "prime video",
    "amznprimeau",
    "kogan mobile",
    "belong",
    "apple.com/bill",
    "aussie broadband",
    "spotify",
    "stan",
    "disney",
    "paramount",
    "binge",
]

def is_subscription_line(line):
    line_lower = line.lower()
    return any(keyword in line_lower for keyword in SUBSCRIPTION_KEYWORDS)

def extract_amount(line):
    # Look for the last $amount in the line (as debit)
    match = re.findall(r"\d+\.\d{2}", line)
    if match:
        # Usually debit comes before balance, so take the first or second
        return float(match[0])
    return 0.0

def main():
    # Replace this with the actual text you extract from your PDF
    with open("statement_text.txt", "r") as f:
        text = f.read()

    subscriptions = []
    total = 0.0

    for line in text.splitlines():
        if is_subscription_line(line):
            amount = extract_amount(line)
            subscriptions.append((line.strip(), amount))
            total += amount

    print("Subscriptions found:\n")
    for line, amount in subscriptions:
        print(f"{line}\n  -> ${amount:.2f}\n")

    print(f"Total subscription spending: ${total:.2f}")

if __name__ == "__main__":
    main()
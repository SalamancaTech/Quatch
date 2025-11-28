
from playwright.sync_api import sync_playwright
import os

def verify_game_state():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local HTML file using absolute path
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Wait for game to initialize (Start button click simulated via script or if initGame runs)
        # Our game starts with a Start Screen (Modal).

        # Click "PLAY" button on Start Screen
        # The button is .main-menu-btn inside #start-screen
        try:
             page.click("#start-screen .main-menu-btn", timeout=2000)
        except:
             print("Start button not found or already started.")

        # Wait for the swap phase UI to appear
        # Verify Stage 2: Hand should have cards, Last Chance should have cards.
        page.wait_for_selector("#player-hand-container .card", timeout=5000)

        # Take Screenshot 1: Initial Swap Phase
        page.screenshot(path="verification/step1_swap_phase.png")
        print("Screenshot 1 taken: Initial Swap Phase")

        # Verify Drag and Drop Reorder (Visual Only - Hard to script complex drag event precisely to trigger reorder without exact coords)
        # But we can verify dragging a card from LC to Hand.

        # Get first LC card
        lc_cards = page.query_selector_all("#player-special-cards .last-chance-card")
        if lc_cards:
            # Drag first LC card to Hand Container
            box = lc_cards[0].bounding_box()
            target_box = page.query_selector("#player-hand-container").bounding_box()

            page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
            page.mouse.down()
            page.mouse.move(target_box["x"] + target_box["width"]/2, target_box["y"] + target_box["height"]/2, steps=10)
            page.mouse.up()

            # Wait a bit for update
            page.wait_for_timeout(500)

            # Take Screenshot 2: After Drag LC -> Hand
            page.screenshot(path="verification/step2_after_drag.png")
            print("Screenshot 2 taken: After LC -> Hand")

        browser.close()

if __name__ == "__main__":
    verify_game_state()

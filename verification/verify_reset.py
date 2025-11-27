
from playwright.sync_api import sync_playwright
import os

def run():
    file_path = os.path.abspath('index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        # 1. Start Game
        page.click('button:has-text("PLAY")')

        # Verify NO Swap Modal (game-modal should be hidden)
        # Note: Generic modal uses #game-modal
        # We wait a bit to ensure it doesn't pop up
        try:
            page.wait_for_selector('#game-modal', state='visible', timeout=1000)
            print('FAILURE: Modal appeared')
        except:
            print('Success: No Modal appeared on start')

        # 2. Reset Game
        page.click('#menu-btn')
        page.click('button:has-text("New Game")')

        # Verify returned to Start Screen
        page.wait_for_selector('#start-screen', state='visible')
        print('Returned to Start Screen')

        # 3. Start Game Again
        page.click('button:has-text("PLAY")')

        # Verify Deck is reset (cards dealt)
        # We can check if player hand has cards
        page.wait_for_selector('.hand-card')
        count = page.evaluate('document.querySelectorAll(".hand-card").length')
        print(f'Hand cards count: {count}')
        if count != 3:
             print('FAILURE: Hand not dealt correctly on restart')
        else:
             print('Success: Hand dealt correctly on restart')

        browser.close()

if __name__ == '__main__':
    run()

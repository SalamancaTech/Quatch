
from playwright.sync_api import sync_playwright
import os

def run():
    file_path = os.path.abspath('index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        # --- Test 1: Start Screen Visibility ---
        page.wait_for_selector('#start-screen', state='visible')
        print('Start Screen visible on load')

        # Check Menu Button hidden
        expect_hidden = page.locator('#menu-btn')
        # We need to check if it has class 'hidden' or is display:none
        # 'hidden' class sets display: none
        if expect_hidden.is_visible():
             # Check class
             classes = expect_hidden.get_attribute('class')
             if 'hidden' not in classes:
                 print('FAILURE: Menu btn visible on start screen')
             else:
                 print('Menu btn hidden (CSS class check passed)')
        else:
             print('Menu btn hidden')

        # --- Test 2: Start Game ---
        page.click('button:has-text("PLAY")')

        # Expect Start Screen hidden
        page.wait_for_selector('#start-screen', state='hidden')
        print('Start Screen hidden after Play')

        # Expect Swap Phase Modal
        page.wait_for_selector('#game-modal', state='visible')
        print('Game started (Swap Modal visible)')

        # Dismiss Modal
        page.click('#modal-btn')

        # --- Test 3: Reset to Menu ---
        page.click('#menu-btn')
        page.click('button:has-text("New Game")')

        # Expect Start Screen visible
        page.wait_for_selector('#start-screen', state='visible')
        print('Returned to Start Screen after Reset')

        browser.close()

if __name__ == '__main__':
    run()

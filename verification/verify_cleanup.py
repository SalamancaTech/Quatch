
from playwright.sync_api import sync_playwright
import os

def run():
    file_path = os.path.abspath('index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        # Start Game
        page.click('button:has-text("PLAY")')

        # Check Stage (indirectly via UI or variable)
        # Check that Name Tags are GONE
        if page.locator('#opponent-info').count() > 0:
            print('FAILURE: Opponent Info still present')
        else:
            print('Success: Opponent Info removed')

        if page.locator('#player-info').count() > 0:
            print('FAILURE: Player Info still present')
        else:
            print('Success: Player Info removed')

        if page.locator('#action-button').count() > 0:
            print('FAILURE: Action Button still present')
        else:
            print('Success: Action Button removed')

        # Check that Game Message appears (indicating start)
        # 'determineStartPlayer' shows a message.
        # We check if message display is visible or has text
        msg = page.locator('#message-display')
        # Wait a moment for message to appear
        try:
            msg.wait_for(state='visible', timeout=2000)
            text = msg.inner_text()
            print(f'Game Started Message: {text}')
        except:
            print('Warning: Game Start message not detected (might be too fast)')

        browser.close()

if __name__ == '__main__':
    run()

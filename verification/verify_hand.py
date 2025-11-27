
from playwright.sync_api import sync_playwright
import os

def run():
    file_path = os.path.abspath('index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        # Wait for initialization
        page.wait_for_selector('#game-modal', state='visible')
        page.click('#modal-btn')
        page.wait_for_selector('#game-modal', state='hidden')

        # Inject many cards into hand via JS
        page.evaluate('''() => {
             // Create 10 dummy cards
             const dummyCards = Array(10).fill(null).map((_, i) => ({
                suit: '♠', rank: i+2, display: (i+2).toString(), value: i+2
             }));
             state.players.human.hand = dummyCards;
             updateUI();
        }''')

        page.wait_for_timeout(500)
        page.screenshot(path='verification/hand_overlap.png')
        print('Hand Overlap screenshot taken')

        browser.close()

if __name__ == '__main__':
    run()

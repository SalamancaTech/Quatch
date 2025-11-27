
from playwright.sync_api import sync_playwright
import os

def run():
    file_path = os.path.abspath('index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        # Wait for initialization (Modal Visible)
        page.wait_for_selector('#game-modal', state='visible')
        page.screenshot(path='verification/init.png')
        print('Initial screenshot (Modal Open) taken')

        # Dismiss Initial Modal
        page.click('#modal-btn')
        page.wait_for_selector('#game-modal', state='hidden')

        # Open Menu
        page.click('#menu-btn')
        page.wait_for_selector('#menu-dropdown', state='visible')
        page.screenshot(path='verification/menu.png')
        print('Menu screenshot taken')

        # Close Menu (toggle)
        page.click('#menu-btn')

        # Open Rules Modal (Need to reopen menu first)
        page.click('#menu-btn')
        page.click('button:has-text("Rules")')
        page.wait_for_selector('#rules-modal', state='visible')
        page.screenshot(path='verification/rules.png')
        print('Rules screenshot taken')

        # Close Rules
        page.click('#rules-modal .close-btn')
        page.wait_for_selector('#rules-modal', state='hidden')

        # Check Stats Modal
        page.click('#menu-btn')
        page.click('button:has-text("Statistics")')
        page.wait_for_selector('#stats-modal', state='visible')
        page.screenshot(path='verification/stats.png')
        print('Stats screenshot taken')

        browser.close()

if __name__ == '__main__':
    run()

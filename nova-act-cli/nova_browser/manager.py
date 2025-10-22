# adapted from https://github.com/aws/nova-act/blob/5492afa/src/nova_act/impl/playwright.py
from typing import Optional

from nova_act.impl.playwright import PlaywrightInstanceManager as NovaActPlaywrightInstanceManager
from playwright.sync_api import sync_playwright


class ScoutInstanceManager(NovaActPlaywrightInstanceManager):

    def start(self, session_logs_directory: Optional[str] = None) -> None:
        if self._context is not None:
            return

        if self._cdp_endpoint_url is not None:
            try:
                if self._playwright is None:
                    self._playwright = sync_playwright().start()
                browser = self._playwright.chromium.connect_over_cdp(self._cdp_endpoint_url, headers=self._cdp_headers)
                self._context = browser.contexts[0]

                page = self._context.pages[0] if len(self._context.pages) > 0 else self._context.new_page()

                current_url = page.url

                # crucial handle to ensure the act perform on browser's page
                if self._starting_page and current_url != self._starting_page:
                    page.goto(self._starting_page)

            except:
                super().start(session_logs_directory)
        else:
            super().start(session_logs_directory)

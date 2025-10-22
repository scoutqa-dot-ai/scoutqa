from nova_act.impl.actuation.playwright.default_nova_local_browser_actuator import DefaultNovaLocalBrowserActuator
from nova_act.impl.playwright_instance_options import PlaywrightInstanceOptions

from nova_browser.manager import ScoutInstanceManager


class ScoutActuator(DefaultNovaLocalBrowserActuator):
    def __init__(
            self,
            playwright_options: PlaywrightInstanceOptions,
    ):
        super().__init__(playwright_options)

        # immediately replace the super's manager with ours
        self._playwright_manager = ScoutInstanceManager(playwright_options)

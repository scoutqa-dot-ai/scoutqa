import argparse
import json
import re

from nova_act import NovaAct

from nova_browser.actuator import ScoutActuator


def format_starting_page(url: str) -> str:
    if url.startswith('http://') or url.startswith('https://'):
        return url
    return f"https://{url}"


def main():
    parser = argparse.ArgumentParser(description='Nova Act CLI - Browser automation tool')
    parser.add_argument('--cdp-endpoint-url', help='A CDP endpoint to connect to')
    parser.add_argument('--cdp-headers', help='Additional HTTP headers to be sent when connecting to a CDP endpoint')
    parser.add_argument('--prompt', required=True, help='The natural language task to actuate on the web browser')
    parser.add_argument('--starting-page', required=True, help='Starting web page for the browser window')

    try:
        args = parser.parse_args()

        cdp_headers = json.loads(args.cdp_headers) if args.cdp_headers else None
        starting_page = format_starting_page(args.starting_page)

        nova_instance = NovaAct(
            actuator=ScoutActuator,
            cdp_endpoint_url=args.cdp_endpoint_url,
            cdp_headers=cdp_headers,
            starting_page=starting_page,
        )

        nova_instance.start()

        result = nova_instance.act(args.prompt)

        nova_instance.stop()

        metadata = result.metadata
        print(json.dumps({
            'is_success': True,
            'result': {
                'response': result.response,
                'metadata': {
                    'act_id': metadata.act_id,
                    'end_time': metadata.end_time,
                    'num_steps_executed': metadata.num_steps_executed,
                    'session_id': metadata.session_id,
                    'start_time': metadata.start_time,
                    'step_server_times_s': metadata.step_server_times_s,
                }
            }
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "is_success": False,
            "error": str(e),
        }))


if __name__ == "__main__":
    main()

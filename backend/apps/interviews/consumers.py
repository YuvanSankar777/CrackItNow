import json
from channels.generic.websocket import AsyncWebsocketConsumer


class InterviewSessionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.group_name = f"interview_session_{self.session_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        payload = json.loads(text_data)
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'session_event',
                'payload': payload,
            }
        )

    async def session_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))

"""VOICEVOX TTS 服务"""
import base64
import httpx
from fastapi import HTTPException, status
from app.config import get_settings


class VoicevoxService:
    """VOICEVOX TTS 服务封装"""
    
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.voicevox_url
        self.speaker_id = settings.voicevox_speaker
        
    async def tts(self, text: str, speaker: int | None = None) -> str:
        """
        生成语音并返回 base64 编码的 WAV 音频
        
        Args:
            text: 要合成的文本
            speaker: 说话人 ID（可选，默认使用实例设置的 speaker_id）
            
        Returns:
            base64 编码的 WAV 音频数据
        """
        speaker_id = speaker or self.speaker_id
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # 步骤 1: 生成音频查询（audio_query）
                query_response = await client.post(
                    f"{self.base_url}/audio_query",
                    params={"text": text, "speaker": speaker_id}
                )
                query_response.raise_for_status()
                audio_query = query_response.json()
                
                # 步骤 2: 合成音频
                synthesis_response = await client.post(
                    f"{self.base_url}/synthesis",
                    params={"speaker": speaker_id},
                    json=audio_query,
                    headers={"Content-Type": "application/json"}
                )
                synthesis_response.raise_for_status()
                
                # 获取 WAV 音频数据
                wav_data = synthesis_response.content
                
                # 转换为 base64
                audio_base64 = base64.b64encode(wav_data).decode('utf-8')
                
                return audio_base64
                
        except httpx.TimeoutException as e:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"VOICEVOX 服务响应超时: {str(e)}"
            ) from e
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"VOICEVOX 服务错误: {e.response.status_code}"
            ) from e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"TTS 生成失败: {str(e)}"
            ) from e


# 创建全局实例
voicevox_service = VoicevoxService()

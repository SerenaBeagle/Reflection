'use client';

import React, { useEffect, useState } from 'react';
import { AudioLines, Loader2, PhoneCall, PhoneOff } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { ModeSelector } from '@/components/ModeSelector';
import { DiaryTextArea } from '@/components/DiaryTextArea';
import { requestChatStream } from '@/frontend/api/chat-api';
import { requestRealtimeSession } from '@/frontend/api/realtime-api';
import { requestSpeechAudio } from '@/frontend/api/speech-api';
import { requestTranscription } from '@/frontend/api/transcribe-api';
import { AIMode } from '@/types/user';
import { Message } from '@/types/message';
import { supabase } from '@/lib/supabase/client';

type ThreadRecord = {
  id: string;
  title: string | null;
  updated_at?: string | null;
};

type MessageRecord = {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  transcript: string | null;
  message_kind: 'text' | 'audio' | null;
  created_at: string;
  mode: string | null;
};

type PendingRetry = {
  message: string;
  imageUrl: string | null;
  userMessage: Message;
  activeMode: 'chat' | 'diary';
  aiMode: AIMode;
  asAudioReply?: boolean;
};

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'diary'>('chat');
  const [aiMode, setAIMode] = useState<AIMode>('gentle-listener');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState(getModeLabel('gentle-listener'));
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingReply, setStreamingReply] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRealtimeConnecting, setIsRealtimeConnecting] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('准备好开始语音通话。');
  const [liveAssistantTranscript, setLiveAssistantTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingRetry, setPendingRetry] = useState<PendingRetry | null>(null);
  const roleProfile = ROLE_PROFILES[aiMode];
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const recordingStreamRef = React.useRef<MediaStream | null>(null);
  const recordingStartedAtRef = React.useRef<number | null>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const localRealtimeStreamRef = React.useRef<MediaStream | null>(null);
  const voiceSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const stopActiveRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    stopStreamTracks(recordingStreamRef.current);
    mediaRecorderRef.current = null;
    recordingStreamRef.current = null;
    recordedChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setIsRecording(false);
  };

  const clearSelectedImage = React.useCallback(() => {
    if (selectedImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setSelectedImageFile(null);
    setSelectedImagePreviewUrl(null);
  }, [selectedImagePreviewUrl]);

  const disconnectRealtimeSession = React.useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    stopStreamTracks(localRealtimeStreamRef.current);
    localRealtimeStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    setIsRealtimeConnecting(false);
    setIsRealtimeActive(false);
    setLiveAssistantTranscript('');
    setRealtimeStatus('语音通话已结束。');
  }, []);

  async function loadThreadMessages(targetThread: ThreadRecord, currentThreads: ThreadRecord[], currentUserId: string) {
    setThreadId(targetThread.id);
    setThreadTitle(getModeLabel(parseThreadMode(targetThread.title)));

    const targetMode = parseThreadMode(targetThread.title);
    const relatedThreadIds = Array.from(
      new Set(
        currentThreads
          .filter((thread) => thread.title === buildModeThreadTitle(targetMode))
          .map((thread) => thread.id)
          .concat(targetThread.id)
      )
    );

    const { data: threadMessageRows, error: threadMessagesError } = await supabase
      .from('messages')
      .select('id, thread_id, role, content, image_url, audio_url, audio_duration_seconds, transcript, message_kind, created_at, mode')
      .eq('user_id', currentUserId)
      .in('thread_id', relatedThreadIds)
      .order('created_at', { ascending: true });

    if (threadMessagesError) {
      setErrorMessage(threadMessagesError.message);
      return;
    }

    const { data: modeMessageRows, error: modeMessagesError } = await supabase
      .from('messages')
      .select('id, thread_id, role, content, image_url, audio_url, audio_duration_seconds, transcript, message_kind, created_at, mode')
      .eq('user_id', currentUserId)
      .eq('mode', targetMode)
      .order('created_at', { ascending: true });

    if (modeMessagesError) {
      setErrorMessage(modeMessagesError.message);
      return;
    }

    const mergedMessages = [...(threadMessageRows || []), ...(modeMessageRows || [])];
    const dedupedMessages = Array.from(
      new Map(mergedMessages.map((message) => [message.id, message])).values()
    ).sort((left, right) => left.created_at.localeCompare(right.created_at));

    setMessages(dedupedMessages.map(mapMessageRecord));
  }

  useEffect(() => {
    const loadChat = async () => {
      setIsLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage(authError?.message ?? '未获取到登录用户。');
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: existingThreads, error: threadError } = await supabase
        .from('chat_threads')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (threadError) {
        setErrorMessage(threadError.message);
        setIsLoading(false);
        return;
      }

      setThreads(existingThreads || []);
      setIsLoading(false);
    };

    void loadChat();
  }, []);

  useEffect(() => {
    const loadModeThread = async () => {
      if (!userId) {
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const targetTitle = buildModeThreadTitle(aiMode);
      let activeThread = threads.find((thread) => thread.title === targetTitle) || null;

      if (!activeThread) {
        const { data: legacyMessage, error: legacyMessageError } = await supabase
          .from('messages')
          .select('thread_id, created_at')
          .eq('user_id', userId)
          .eq('mode', aiMode)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (legacyMessageError) {
          setErrorMessage(legacyMessageError.message);
          setIsLoading(false);
          return;
        }

        if (legacyMessage?.thread_id) {
          const existingLegacyThread = threads.find((thread) => thread.id === legacyMessage.thread_id) || null;

          if (existingLegacyThread) {
            const updatedLegacyThread = {
              ...existingLegacyThread,
              title: targetTitle,
            };

            const { error: updateThreadError } = await supabase
              .from('chat_threads')
              .update({ title: targetTitle })
              .eq('id', existingLegacyThread.id);

            if (updateThreadError) {
              setErrorMessage(updateThreadError.message);
              setIsLoading(false);
              return;
            }

            activeThread = updatedLegacyThread;
            setThreads((current) =>
              current.map((thread) =>
                thread.id === updatedLegacyThread.id ? updatedLegacyThread : thread
              )
            );
          } else {
            const { data: fetchedLegacyThread, error: fetchLegacyThreadError } = await supabase
              .from('chat_threads')
              .select('id, title, updated_at')
              .eq('id', legacyMessage.thread_id)
              .single();

            if (fetchLegacyThreadError) {
              setErrorMessage(fetchLegacyThreadError.message);
              setIsLoading(false);
              return;
            }

            const { error: updateThreadError } = await supabase
              .from('chat_threads')
              .update({ title: targetTitle })
              .eq('id', fetchedLegacyThread.id);

            if (updateThreadError) {
              setErrorMessage(updateThreadError.message);
              setIsLoading(false);
              return;
            }

            activeThread = {
              ...fetchedLegacyThread,
              title: targetTitle,
            };

            setThreads((current) => [activeThread!, ...current.filter((thread) => thread.id !== activeThread!.id)]);
          }
        }
      }

      if (!activeThread) {
        const legacyGenericThread =
          threads.find((thread) => thread.title && !thread.title.startsWith('mode::')) ||
          threads.find((thread) => !thread.title) ||
          null;

        if (legacyGenericThread) {
          const updatedLegacyThread = {
            ...legacyGenericThread,
            title: targetTitle,
          };

          const { error: updateThreadError } = await supabase
            .from('chat_threads')
            .update({ title: targetTitle })
            .eq('id', legacyGenericThread.id);

          if (updateThreadError) {
            setErrorMessage(updateThreadError.message);
            setIsLoading(false);
            return;
          }

          activeThread = updatedLegacyThread;
          setThreads((current) =>
            current.map((thread) =>
              thread.id === updatedLegacyThread.id ? updatedLegacyThread : thread
            )
          );
        }
      }

      if (!activeThread) {
        const { data: newThread, error } = await supabase
          .from('chat_threads')
          .insert({
            user_id: userId,
            title: targetTitle,
          })
          .select('id, title, updated_at')
          .single();

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        activeThread = newThread;
        setThreads((current) => {
          const deduped = current.filter((item) => item.id !== newThread.id);
          return [newThread, ...deduped];
        });
      }

      await loadThreadMessages(activeThread, threads, userId);
      setIsLoading(false);
    };

    void loadModeThread();
  }, [aiMode, threads, userId]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }

      stopStreamTracks(recordingStreamRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      disconnectRealtimeSession();
    };
  }, [disconnectRealtimeSession]);

  const refreshThreads = async () => {
    if (!userId) {
      return;
    }

    const { data, error } = await supabase
      .from('chat_threads')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const threadList = data || [];
    setThreads(threadList);
  };

  const handlePickImage = (file: File | null) => {
    if (!file) {
      clearSelectedImage();
      return;
    }

    if (!isAllowedImageType(file)) {
      setErrorMessage('目前支持 PNG、JPG、WEBP 和 GIF 图片。');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('图片请控制在 10MB 以内。');
      return;
    }

    if (selectedImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setErrorMessage('');
    setSelectedImageFile(file);
    setSelectedImagePreviewUrl(URL.createObjectURL(file));
  };

  const persistAssistantReply = async ({
    reply,
    activeMode,
    asAudio,
  }: {
    reply: string;
    activeMode: AIMode | 'diary';
    asAudio: boolean;
  }) => {
    if (!threadId || !userId) {
      return {
        ok: false as const,
        error: '聊天线程暂时不可用，请刷新后重试。',
      };
    }

    if (asAudio) {
      const speechResult = await requestSpeechAudio(reply);

      if (!speechResult.ok) {
        return {
          ok: false as const,
          error: speechResult.error,
        };
      }

      const audioDurationSeconds = await measureAudioDuration(speechResult.blob);
      const audioFile = new File([speechResult.blob], `assistant-${Date.now()}.mp3`, {
        type: speechResult.blob.type || 'audio/mpeg',
      });
      const uploadResult = await uploadChatAudio(audioFile, userId);

      if (!uploadResult.ok) {
        return {
          ok: false as const,
          error: uploadResult.error,
        };
      }

      const { data: insertedAiMessage, error: insertAiError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          user_id: userId,
          role: 'assistant',
          content: reply,
          transcript: reply,
          audio_url: uploadResult.audioUrl,
          audio_duration_seconds: audioDurationSeconds,
          message_kind: 'audio',
          mode: activeMode,
        })
        .select('id, thread_id, role, content, image_url, audio_url, audio_duration_seconds, transcript, message_kind, created_at, mode')
        .single();

      if (insertAiError || !insertedAiMessage) {
        return {
          ok: false as const,
          error: 'AI 已经生成语音回复，但保存到聊天记录时失败了。',
        };
      }

      return {
        ok: true as const,
        messages: [mapMessageRecord(insertedAiMessage)],
      };
    }

    const aiMessageParts = splitAssistantReply(reply);

    const { data: insertedAiMessages, error: insertAiError } = await supabase
      .from('messages')
      .insert(
        aiMessageParts.map((content) => ({
          thread_id: threadId,
          user_id: userId,
          role: 'assistant',
          content,
          mode: activeMode,
        }))
      )
      .select('id, thread_id, role, content, image_url, audio_url, audio_duration_seconds, transcript, message_kind, created_at, mode')
      .order('created_at', { ascending: true });

    if (insertAiError || !insertedAiMessages?.length) {
      return {
        ok: false as const,
        error: 'AI 已经生成回复，但保存到聊天记录时失败了。',
      };
    }

    return {
      ok: true as const,
      messages: insertedAiMessages.map(mapMessageRecord),
    };
  };

  const sendVoiceMessage = async (audioFile: File, audioDurationSeconds: number) => {
    if (!threadId || !userId) {
      return;
    }

    setIsSending(true);
    setIsTranscribing(true);
    setErrorMessage('');
    setStreamingReply('');

    const [uploadResult, transcriptionResult] = await Promise.all([
      uploadChatAudio(audioFile, userId),
      requestTranscription(audioFile),
    ]);

    setIsTranscribing(false);

    if (!uploadResult.ok) {
      setErrorMessage(uploadResult.error);
      setIsSending(false);
      return;
    }

    if (!transcriptionResult.ok) {
      setErrorMessage(transcriptionResult.error);
      setIsSending(false);
      return;
    }

    const transcript = transcriptionResult.text.trim();

    if (!transcript) {
      setErrorMessage('这段语音没有识别出文字，你可以再说一次。');
      setIsSending(false);
      return;
    }

    const activeMode = aiMode;

    const { data: insertedUserMessage, error: insertUserError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role: 'user',
        content: transcript,
        transcript,
        audio_url: uploadResult.audioUrl,
        audio_duration_seconds: audioDurationSeconds,
        message_kind: 'audio',
        mode: activeMode,
      })
      .select('id, thread_id, role, content, image_url, audio_url, audio_duration_seconds, transcript, message_kind, created_at, mode')
      .single();

    if (insertUserError || !insertedUserMessage) {
      setErrorMessage(insertUserError?.message || '保存语音消息失败。');
      setIsSending(false);
      return;
    }

    const userMessage = mapMessageRecord(insertedUserMessage);
    setMessages((current) => [...current, userMessage]);
    setPendingRetry(null);

    await supabase
      .from('chat_threads')
      .update({
        updated_at: new Date().toISOString(),
        title: buildModeThreadTitle(aiMode),
      })
      .eq('id', threadId);

    await refreshThreads();

    const aiReply = await streamAIReply({
      message: transcript,
      aiMode,
      mode: 'chat',
      messages: [...messages, userMessage],
    });

    if (!aiReply.ok) {
      setPendingRetry({
        message: transcript,
        imageUrl: null,
        userMessage,
        activeMode: 'chat',
        aiMode,
        asAudioReply: true,
      });
      setErrorMessage(aiReply.error);
      setIsSending(false);
      return;
    }

    const persistResult = await persistAssistantReply({
      reply: aiReply.reply,
      activeMode,
      asAudio: true,
    });

    if (!persistResult.ok) {
      setPendingRetry({
        message: transcript,
        imageUrl: null,
        userMessage,
        activeMode: 'chat',
        aiMode,
        asAudioReply: true,
      });
      setErrorMessage(persistResult.error);
      setIsSending(false);
      return;
    }

    setMessages((current) => [...current, ...persistResult.messages]);
    setIsSending(false);
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    const hasImage = Boolean(selectedImageFile);

    if ((!trimmedInput && !hasImage) || !threadId || !userId) {
      return;
    }

    setIsSending(true);
    setErrorMessage('');

    let uploadedImageUrl: string | null = null;

    if (selectedImageFile) {
      const uploadResult = await uploadChatImage(selectedImageFile, userId);

      if (!uploadResult.ok) {
        setErrorMessage(uploadResult.error);
        setIsSending(false);
        return;
      }

      uploadedImageUrl = uploadResult.imageUrl;
    }

    const activeMode = mode === 'chat' ? aiMode : 'diary';

    const { data: insertedUserMessage, error: insertUserError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role: 'user',
        content: trimmedInput,
        image_url: uploadedImageUrl,
        mode: activeMode,
      })
      .select('id, thread_id, role, content, image_url, audio_url, audio_duration_seconds, transcript, message_kind, created_at, mode')
      .single();

    if (insertUserError) {
      setErrorMessage(insertUserError.message);
      setIsSending(false);
      return;
    }

    const userMessage = mapMessageRecord(insertedUserMessage);
    setMessages((current) => [...current, userMessage]);
    setInput('');
    clearSelectedImage();
    setPendingRetry(null);

    if (mode === 'diary') {
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Australia/Sydney',
      });

      const { error: diaryError } = await supabase
        .from('diary_entries')
        .insert({
          user_id: userId,
          thread_id: threadId,
          source_message_id: insertedUserMessage.id,
          entry_date: today,
          raw_text: trimmedInput,
          summary_short: buildDiarySummary(trimmedInput),
          dominant_emotion: detectEmotion(trimmedInput),
        });

      if (diaryError) {
        setErrorMessage(diaryError.message);
      }
    }

    await supabase
      .from('chat_threads')
      .update({
        updated_at: new Date().toISOString(),
        title: buildModeThreadTitle(aiMode),
      })
      .eq('id', threadId);

    await refreshThreads();

    const aiReply = await streamAIReply({
      message: trimmedInput,
      imageUrl: uploadedImageUrl,
      aiMode,
      mode,
      messages: [...messages, userMessage],
      onDelta: setStreamingReply,
    });

    if (!aiReply.ok) {
      setPendingRetry({
        message: trimmedInput,
        imageUrl: uploadedImageUrl,
        userMessage,
        activeMode: mode,
        aiMode,
      });
      setErrorMessage(aiReply.error);
      setIsSending(false);
      setStreamingReply('');
      return;
    }

    const persistResult = await persistAssistantReply({
      reply: aiReply.reply,
      activeMode,
      asAudio: false,
    });

    if (persistResult.ok) {
      setMessages((current) => [...current, ...persistResult.messages]);
    } else {
      setErrorMessage(persistResult.error);
    }

    setStreamingReply('');
    setIsSending(false);
  };

  const handleRetry = async () => {
    if (!pendingRetry || !threadId || !userId || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    setStreamingReply('');

    const aiReply = await streamAIReply({
      message: pendingRetry.message,
      imageUrl: pendingRetry.imageUrl,
      aiMode: pendingRetry.aiMode,
      mode: pendingRetry.activeMode,
      messages: [...messages],
      onDelta: setStreamingReply,
    });

    if (!aiReply.ok) {
      setErrorMessage(aiReply.error);
      setIsSending(false);
      setStreamingReply('');
      return;
    }

    const persistResult = await persistAssistantReply({
      reply: aiReply.reply,
      activeMode: pendingRetry.activeMode === 'chat' ? pendingRetry.aiMode : pendingRetry.activeMode,
      asAudio: Boolean(pendingRetry.asAudioReply),
    });

    if (persistResult.ok) {
      setMessages((current) => [...current, ...persistResult.messages]);
      setPendingRetry(null);
    } else {
      setErrorMessage(persistResult.error);
    }

    setStreamingReply('');
    setIsSending(false);
  };

  const handleStartVoiceInput = async () => {
    if (!voiceSupported || isSending || isLoading || isTranscribing || mode !== 'chat' || isRecording) {
      return;
    }

    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setErrorMessage('录音时出了点问题，请再试一次。');
        setIsRecording(false);
        setIsTranscribing(false);
        stopActiveRecording();
      };

      recorder.onstop = async () => {
        setIsRecording(false);

        const chunks = [...recordedChunksRef.current];
        recordedChunksRef.current = [];
        stopStreamTracks(recordingStreamRef.current);
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (!chunks.length) {
          return;
        }

        const audioBlob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });

        const extension = getAudioFileExtension(audioBlob.type);
        const audioFile = new File([audioBlob], `voice-input.${extension}`, {
          type: audioBlob.type || 'audio/webm',
        });
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - (recordingStartedAtRef.current || Date.now())) / 1000)
        );

        recordingStartedAtRef.current = null;
        await sendVoiceMessage(audioFile, durationSeconds);
      };

      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
    } catch {
      setErrorMessage('没有拿到麦克风权限，请在浏览器里允许录音后再试。');
      setIsRecording(false);
      setIsTranscribing(false);
      recordingStartedAtRef.current = null;
      stopActiveRecording();
    }
  };

  const handleStopVoiceInput = () => {
    if (!isRecording) {
      return;
    }

    mediaRecorderRef.current?.stop();
  };

  const handleToggleRealtimeVoice = async () => {
    if (!voiceSupported || isLoading || isSending || isRecording || isTranscribing) {
      return;
    }

    if (isRealtimeActive || isRealtimeConnecting) {
      disconnectRealtimeSession();
      return;
    }

    try {
      setErrorMessage('');
      setIsRealtimeConnecting(true);
      setRealtimeStatus('正在连接语音通话...');
      setLiveAssistantTranscript('');

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localRealtimeStreamRef.current = localStream;

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      const remoteAudio = document.createElement('audio');
      remoteAudio.autoplay = true;
      remoteAudio.setAttribute('playsinline', 'true');
      remoteAudioRef.current = remoteAudio;

      peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;

        if (state === 'connected') {
          setIsRealtimeConnecting(false);
          setIsRealtimeActive(true);
          setRealtimeStatus('语音通话已接通，可以直接说话。');
          return;
        }

        if (state === 'connecting') {
          setRealtimeStatus('语音通话连接中...');
          return;
        }

        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          disconnectRealtimeSession();
        }
      };

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      const dataChannel = peerConnection.createDataChannel('oai-events');
      dataChannelRef.current = dataChannel;

      dataChannel.addEventListener('open', () => {
        setRealtimeStatus('语音通话已连接，开始说话吧。');
      });

      dataChannel.addEventListener('close', () => {
        setRealtimeStatus('语音通话已断开。');
      });

      dataChannel.addEventListener('message', (event) => {
        handleRealtimeServerEvent({
          data: event.data,
          setErrorMessage,
          setRealtimeStatus,
          setLiveAssistantTranscript,
        });
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const sessionResult = await requestRealtimeSession({
        aiMode,
        sdp: offer.sdp || '',
      });

      if (!sessionResult.ok) {
        throw new Error(sessionResult.error);
      }

      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: sessionResult.sdp,
      });
    } catch (error) {
      disconnectRealtimeSession();
      setErrorMessage(error instanceof Error ? error.message : '实时语音连接失败，请稍后再试。');
    }
  };

  return (
    <div className="flex h-screen max-h-screen flex-col bg-transparent">
      <AppHeader title={threadTitle} right={<ModeSelector value={aiMode} onChange={setAIMode} />} />
      <div className="border-b border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${roleProfile.avatarClass}`}>
            {roleProfile.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[color:var(--ikea-blue-deep)]">{roleProfile.name}</h2>
              <span className="rounded-full bg-[color:var(--surface-muted)] px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--slate)]">
                friend mode
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-[color:var(--slate)]">{roleProfile.welcome}</p>
            {mode === 'chat' ? (
              <div className="mt-3 rounded-[20px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--ikea-blue-deep)]">
                      <AudioLines className="h-4 w-4" />
                      实时语音通话
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[color:var(--slate)]">{realtimeStatus}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleRealtimeVoice}
                    disabled={!voiceSupported || isRecording || isTranscribing}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRealtimeActive || isRealtimeConnecting
                        ? 'bg-[#c75050] text-white hover:bg-[#a83f3f]'
                        : 'bg-[color:var(--ikea-blue)] text-white hover:bg-[color:var(--ikea-blue-deep)]'
                    }`}
                  >
                    {isRealtimeConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isRealtimeActive || isRealtimeConnecting ? (
                      <PhoneOff className="h-4 w-4" />
                    ) : (
                      <PhoneCall className="h-4 w-4" />
                    )}
                    {isRealtimeActive || isRealtimeConnecting ? '结束语音' : '开始语音'}
                  </button>
                </div>
                {liveAssistantTranscript ? (
                  <div className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-sm leading-6 text-[color:var(--foreground)]">
                    <span className="mr-2 text-xs uppercase tracking-[0.14em] text-[color:var(--slate)]">
                      live
                    </span>
                    {liveAssistantTranscript}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-[color:var(--slate)]">正在加载聊天记录...</div>
        ) : errorMessage ? (
          <div className="rounded-[22px] border border-[#f0c7c7] bg-[#fff4f2] px-4 py-3 text-sm text-[#b4533c]">
            <div>{errorMessage}</div>
            {pendingRetry ? (
              <button
                className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#9f3f2f] ring-1 ring-[#efc7c0] transition hover:bg-[#fffaf8]"
                onClick={handleRetry}
                type="button"
                disabled={isSending}
              >
                再试一次
              </button>
            ) : null}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-5 py-8 text-center">
            <div className="text-sm font-medium text-[color:var(--ikea-blue-deep)]">{roleProfile.emptyTitle}</div>
            <div className="mt-2 text-sm leading-6 text-[color:var(--slate)]">{roleProfile.emptyDescription}</div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const showTimeDivider =
              !previousMessage ||
              shouldShowTimeDivider(previousMessage.createdAt, msg.createdAt);

            return (
              <React.Fragment key={msg.id}>
                {showTimeDivider ? (
                  <div className="mb-3 text-center text-xs text-[color:var(--slate)]">
                    {formatChatDivider(msg.createdAt)}
                  </div>
                ) : null}
                <ChatBubble
                  message={msg}
                  isUser={msg.sender === 'user'}
                  aiMode={aiMode}
                  timeLabel={formatChatClock(msg.createdAt)}
                />
              </React.Fragment>
            );
          })
        )}
        {streamingReply ? (
          <ChatBubble
            key="streaming-reply"
            message={{
              id: 'streaming-reply',
              threadId: threadId || 'streaming',
              sender: 'ai',
              content: streamingReply,
              createdAt: new Date().toISOString(),
            }}
            isUser={false}
            aiMode={aiMode}
            timeLabel={formatChatClock(new Date().toISOString())}
          />
        ) : null}
        {isSending && !streamingReply ? (
          <div className="flex items-center gap-2 mt-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold animate-pulse ${roleProfile.avatarClass}`}>
              {roleProfile.avatar}
            </div>
            <span className="text-sm text-[color:var(--slate)]">{roleProfile.typingText}</span>
          </div>
        ) : null}
      </div>
      <div className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3">
        <div className="mb-3 flex gap-2">
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              mode === 'chat'
                ? 'border-[color:var(--ikea-blue)] bg-[color:var(--ikea-blue)] text-white'
                : 'border-[color:var(--border-subtle)] bg-[color:var(--surface)] text-[color:var(--slate)]'
            }`}
            onClick={() => setMode('chat')}
          >
            聊天模式
          </button>
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              mode === 'diary'
                ? 'border-[color:var(--ikea-blue)] bg-[color:var(--ikea-blue-soft)] text-[color:var(--ikea-blue-deep)]'
                : 'border-[color:var(--border-subtle)] bg-[color:var(--surface)] text-[color:var(--slate)]'
            }`}
            onClick={() => {
              clearSelectedImage();
              setMode('diary');
            }}
          >
            日记模式
          </button>
        </div>
        {mode === 'chat' ? (
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            imagePreviewUrl={selectedImagePreviewUrl}
            onPickImage={handlePickImage}
            onClearImage={clearSelectedImage}
            disabled={isSending || isLoading}
            onStartVoiceInput={handleStartVoiceInput}
            onStopVoiceInput={handleStopVoiceInput}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            voiceSupported={voiceSupported}
          />
        ) : (
          <DiaryTextArea value={input} onChange={setInput} onSubmit={handleSend} disabled={isSending || isLoading} />
        )}
      </div>
    </div>
  );
}

function mapMessageRecord(record: MessageRecord): Message {
  return {
    id: record.id,
    threadId: record.thread_id,
    sender: record.role === 'user' ? 'user' : 'ai',
    content: record.content,
    imageUrl: record.image_url,
    audioUrl: record.audio_url,
    audioDurationSeconds: record.audio_duration_seconds,
    transcript: record.transcript,
    kind: record.message_kind || (record.audio_url ? 'audio' : 'text'),
    createdAt: record.created_at,
  };
}

function buildDiarySummary(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 36 ? `${trimmed.slice(0, 36)}...` : trimmed;
}

function splitAssistantReply(reply: string) {
  const normalized = reply
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (normalized.length > 1) {
    return normalized.slice(0, 3);
  }

  const single = reply.trim();

  if (!single) {
    return ['嗯，我在。'];
  }

  if (single.length <= 38) {
    return [single];
  }

  const chunks = single
    .split(/(?<=[。！？~])\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (chunks.length > 1) {
    return chunks.slice(0, 3);
  }

  return [single];
}

function buildModeThreadTitle(mode: AIMode) {
  return `mode::${mode}`;
}

function parseThreadMode(title: string | null): AIMode {
  const mode = title?.replace('mode::', '');

  if (
    mode === 'best-friend' ||
    mode === 'gentle-listener' ||
    mode === 'reflective-coach' ||
    mode === 'playful-companion'
  ) {
    return mode;
  }

  return 'gentle-listener';
}

function getModeLabel(mode: AIMode) {
  const labelMap: Record<AIMode, string> = {
    'best-friend': '闺蜜',
    'gentle-listener': '温柔聆听',
    'reflective-coach': '反思教练',
    'playful-companion': '活泼陪伴',
  };

  return labelMap[mode];
}

const ROLE_PROFILES: Record<
  AIMode,
  {
    name: string;
    avatar: string;
    avatarClass: string;
    welcome: string;
    emptyTitle: string;
    emptyDescription: string;
    typingText: string;
  }
> = {
  'best-friend': {
    name: '闺蜜',
    avatar: '闺',
    avatarClass: 'bg-[#b9d2ea] text-[#0f3d67]',
    welcome: '像最熟的朋友一样陪你吐槽、接话、站你这边。你可以直接一点、随意一点。',
    emptyTitle: '今天想先从哪件小事开始聊？',
    emptyDescription: '不需要整理好再开口，情绪乱一点也没关系。',
    typingText: '闺蜜正在想怎么回你...',
  },
  'gentle-listener': {
    name: '温柔聆听',
    avatar: '听',
    avatarClass: 'bg-[#d5e5f4] text-[#003b6f]',
    welcome: '这里更安静一些。你可以慢慢说，我会先认真理解你的感觉，再回应你。',
    emptyTitle: '把今天最想被接住的情绪放在这里。',
    emptyDescription: '一句话也可以，我会陪你往下走。',
    typingText: '温柔聆听正在整理回应...',
  },
  'reflective-coach': {
    name: '反思教练',
    avatar: '思',
    avatarClass: 'bg-[#cad9e8] text-[#29415a]',
    welcome: '如果你想理清反复出现的情绪、关系模式或卡点，我们可以一起拆开来看。',
    emptyTitle: '选一件最近反复困扰你的事。',
    emptyDescription: '我们会从感受、触发点和可行动的部分慢慢梳理。',
    typingText: '反思教练正在帮你梳理...',
  },
  'playful-companion': {
    name: '活泼陪伴',
    avatar: '伴',
    avatarClass: 'bg-[#bdd9ee] text-[#1d4b68]',
    welcome: '这里会轻一点、暖一点。我们不急着变好，先让对话变得有呼吸感。',
    emptyTitle: '来吧，说一句今天最真实的话。',
    emptyDescription: '可以碎碎念，也可以只是想找个人陪你待一会儿。',
    typingText: '活泼陪伴正在接住你的话...',
  },
};

function detectEmotion(content: string): Message['emotion'] {
  const text = content.toLowerCase();

  if (text.includes('开心') || text.includes('高兴') || text.includes('快乐')) return 'happy';
  if (text.includes('难过') || text.includes('伤心') || text.includes('低落')) return 'sad';
  if (text.includes('焦虑') || text.includes('紧张') || text.includes('压力')) return 'anxious';
  if (text.includes('生气') || text.includes('愤怒') || text.includes('烦')) return 'angry';
  if (text.includes('平静') || text.includes('放松') || text.includes('安心')) return 'calm';
  if (text.includes('期待') || text.includes('兴奋')) return 'excited';
  if (text.includes('孤单') || text.includes('寂寞')) return 'lonely';
  if (text.includes('感激') || text.includes('感谢')) return 'grateful';
  if (text.includes('希望') || text.includes('盼望')) return 'hopeful';
  if (text.includes('迷茫') || text.includes('困惑')) return 'confused';

  return 'neutral';
}

async function streamAIReply({
  message,
  imageUrl,
  messages,
  aiMode,
  mode,
  onDelta,
}: {
  message: string;
  imageUrl?: string | null;
  messages: Message[];
  aiMode: AIMode;
  mode: 'chat' | 'diary';
  onDelta?: (value: string) => void;
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  let lastError = '现在网络有点慢，我们暂时没接到回复。';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      onDelta?.('');

      const aiResponse = await requestChatStream({
        message,
        imageUrl,
        messages,
        aiMode,
        mode,
      });

      if (!aiResponse.ok || !aiResponse.body) {
        try {
          const payload = await aiResponse.json();
          lastError = mapChatError(payload?.error);
        } catch {
          lastError = 'AI 现在有点忙，我们稍后再试一次。';
        }

        continue;
      }

      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();
      let aiReply = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        if (!chunk) {
          continue;
        }

        aiReply += chunk;
        onDelta?.(aiReply);
      }

      if (!aiReply.trim()) {
        lastError = 'AI 这次没有成功组织出回复，我们再试一次吧。';
        continue;
      }

      return { ok: true, reply: aiReply };
    } catch {
      lastError = '连接 AI 时发生中断，请检查网络后再试。';
    }
  }

  onDelta?.('');
  return { ok: false, error: lastError };
}

async function uploadChatImage(file: File, userId: string) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension)
    ? fileExtension
    : 'jpg';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await supabase.storage
    .from('chat-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { ok: false as const, error: `图片上传失败：${error.message}` };
  }

  const { data } = supabase.storage.from('chat-images').getPublicUrl(path);

  return { ok: true as const, imageUrl: data.publicUrl };
}

async function uploadChatAudio(file: File, userId: string) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp3';
  const safeExtension = ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'mp4'].includes(fileExtension)
    ? fileExtension
    : 'mp3';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await supabase.storage
    .from('chat-audio')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'audio/mpeg',
    });

  if (error) {
    return { ok: false as const, error: `语音上传失败：${error.message}` };
  }

  const { data } = supabase.storage.from('chat-audio').getPublicUrl(path);

  return { ok: true as const, audioUrl: data.publicUrl };
}

async function measureAudioDuration(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const duration = await new Promise<number>((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = objectUrl;

      audio.onloadedmetadata = () => {
        resolve(Number.isFinite(audio.duration) ? Math.max(1, Math.round(audio.duration)) : 1);
      };

      audio.onerror = () => resolve(1);
    });

    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isAllowedImageType(file: File) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
}

function shouldShowTimeDivider(previous: string, current: string) {
  const previousTime = new Date(previous).getTime();
  const currentTime = new Date(current).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  return currentTime - previousTime >= fiveMinutes || !isSameDay(previous, current);
}

function isSameDay(left: string, right: string) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function formatChatDivider(value: string) {
  const date = new Date(value);
  const now = new Date();

  if (isSameDay(value, now.toISOString())) {
    return `今天 ${formatChatClock(value)}`;
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatChatClock(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapChatError(error: unknown) {
  if (typeof error !== 'string' || !error) {
    return 'AI 现在有点忙，我们稍后再试一次。';
  }

  const normalized = error.toLowerCase();

  if (normalized.includes('api key')) {
    return 'AI 配置还没有完成，请检查 OpenAI API Key。';
  }

  if (normalized.includes('rate limit')) {
    return '今天和 AI 说话的人有点多，我们稍等一下再试。';
  }

  if (normalized.includes('network') || normalized.includes('fetch')) {
    return '网络连接不太稳定，请稍后重试。';
  }

  return `AI 暂时没有顺利回应：${error}`;
}

function handleRealtimeServerEvent({
  data,
  setErrorMessage,
  setRealtimeStatus,
  setLiveAssistantTranscript,
}: {
  data: string;
  setErrorMessage: (value: string) => void;
  setRealtimeStatus: (value: string) => void;
  setLiveAssistantTranscript: React.Dispatch<React.SetStateAction<string>>;
}) {
  try {
    const event = JSON.parse(data) as {
      type?: string;
      delta?: string;
      transcript?: string;
      response?: {
        output?: Array<{
          content?: Array<{
            transcript?: string;
            text?: string;
          }>;
        }>;
      };
      error?: {
        message?: string;
      };
      message?: string;
    };

    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        setRealtimeStatus('正在听你说...');
        return;
      case 'input_audio_buffer.speech_stopped':
        setRealtimeStatus('我在整理你的话...');
        return;
      case 'response.created':
        setLiveAssistantTranscript('');
        setRealtimeStatus('正在回应你...');
        return;
      case 'response.output_audio_transcript.delta':
        if (event.delta) {
          setLiveAssistantTranscript((current) => `${current}${event.delta}`);
        }
        return;
      case 'response.output_audio_transcript.done':
        if (event.transcript) {
          setLiveAssistantTranscript(event.transcript);
        }
        setRealtimeStatus('语音回复完成。');
        return;
      case 'response.done': {
        const transcript = extractRealtimeTranscript(event.response);
        if (transcript) {
          setLiveAssistantTranscript(transcript);
        }
        setRealtimeStatus('语音通话已接通，可以继续说话。');
        return;
      }
      case 'error':
      case 'invalid_request_error':
        setErrorMessage(event.error?.message || event.message || '实时语音返回了一个错误。');
        return;
      default:
        return;
    }
  } catch {
    // Ignore non-JSON data channel messages.
  }
}

function extractRealtimeTranscript(response?: {
  output?: Array<{
    content?: Array<{
      transcript?: string;
      text?: string;
    }>;
  }>;
}) {
  if (!response?.output?.length) {
    return '';
  }

  return response.output
    .flatMap((item) => item.content || [])
    .map((content) => content.transcript || content.text || '')
    .join('')
    .trim();
}

function getPreferredAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];

  return candidateTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function getAudioFileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) {
    return 'mp4';
  }

  if (mimeType.includes('ogg')) {
    return 'ogg';
  }

  return 'webm';
}

function stopStreamTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

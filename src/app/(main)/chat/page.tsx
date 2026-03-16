'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { ModeSelector } from '@/components/ModeSelector';
import { DiaryTextArea } from '@/components/DiaryTextArea';
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
  created_at: string;
  mode: string | null;
};

type PendingRetry = {
  message: string;
  imageUrl: string | null;
  userMessage: Message;
  activeMode: 'chat' | 'diary';
  aiMode: AIMode;
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
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingRetry, setPendingRetry] = useState<PendingRetry | null>(null);
  const roleProfile = ROLE_PROFILES[aiMode];

  async function loadThreadMessages(targetThread: ThreadRecord) {
    setThreadId(targetThread.id);
    setThreadTitle(getModeLabel(parseThreadMode(targetThread.title)));

    const { data: messageRows, error: messagesError } = await supabase
      .from('messages')
      .select('id, thread_id, role, content, image_url, created_at, mode')
      .eq('thread_id', targetThread.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      setErrorMessage(messagesError.message);
      return;
    }

    setMessages((messageRows || []).map(mapMessageRecord));
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

      await loadThreadMessages(activeThread);
      setIsLoading(false);
    };

    void loadModeThread();
  }, [aiMode, threads, userId]);

  useEffect(() => {
    if (mode === 'diary') {
      clearSelectedImage();
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

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

  const clearSelectedImage = () => {
    if (selectedImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setSelectedImageFile(null);
    setSelectedImagePreviewUrl(null);
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
      .select('id, thread_id, role, content, image_url, created_at, mode')
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

    const { data: insertedAiMessage, error: insertAiError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role: 'assistant',
        content: aiReply.reply,
        mode: activeMode,
      })
      .select('id, thread_id, role, content, image_url, created_at, mode')
      .single();

    if (!insertAiError && insertedAiMessage) {
      setMessages((current) => [...current, mapMessageRecord(insertedAiMessage)]);
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

    const { data: insertedAiMessage, error: insertAiError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role: 'assistant',
        content: aiReply.reply,
        mode: pendingRetry.activeMode,
      })
      .select('id, thread_id, role, content, image_url, created_at, mode')
      .single();

    if (!insertAiError && insertedAiMessage) {
      setMessages((current) => [...current, mapMessageRecord(insertedAiMessage)]);
      setPendingRetry(null);
    } else if (insertAiError) {
      setErrorMessage('AI 已经生成回复，但保存到聊天记录时失败了。请稍后再试。');
    }

    setStreamingReply('');
    setIsSending(false);
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
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isUser={msg.sender === 'user'}
              aiMode={aiMode}
            />
          ))
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
            onClick={() => setMode('diary')}
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
    createdAt: record.created_at,
  };
}

function buildDiarySummary(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 36 ? `${trimmed.slice(0, 36)}...` : trimmed;
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
  onDelta: (value: string) => void;
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  let lastError = '现在网络有点慢，我们暂时没接到回复。';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      onDelta('');

      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          imageUrl,
          messages,
          aiMode,
          mode,
        }),
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
        onDelta(aiReply);
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

  onDelta('');
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

function isAllowedImageType(file: File) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
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

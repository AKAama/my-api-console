import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Layout,
  Button,
  Space,
  Form,
  Input,
  InputNumber,
  message,
  Tag,
  Card,
  Typography,
  Modal,
  Row,
  Col,
  Tooltip,
  Empty,
  Tabs,
  Table,
  Select,
  Image,
  Switch,
  Segmented,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  ArrowRightOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  PictureOutlined,
  UploadOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const { Header, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

interface ModelItem {
  model_id: string;
  name: string;
  endpoint: string;
  api_key?: string;
  timeout?: number;
  type?: string;
  dimensions?: number;
}

interface SiteItem {
  site_id: number;
  site_name?: string;
}

interface ModelListResponse {
  list: ModelItem[];
  total: number;
  page: number;
  page_size: number;
}

interface SiteListResponse {
  list: SiteItem[];
  total: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ImageGenerationResult {
  id?: string;
  data?: {
    image_urls?: string[];
    image_base64?: string[];
  };
  metadata?: {
    failed_count?: string;
    success_count?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

interface VoiceItem {
  voice_id: string;
  voice_name?: string;
  created_time?: string;
  description?: string[];
  source: 'system_voice' | 'voice_cloning' | 'voice_generation' | 'music_generation';
}

interface SpeechSynthesisResult {
  data?: {
    audio_data_url?: string;
    audio_base64?: string;
    status?: number;
  };
  extra_info?: {
    audio_length?: number;
    audio_size?: number;
    audio_format?: string;
    usage_characters?: number;
  };
  trace_id?: string;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

interface VideoTaskResult {
  task_id?: string;
  status?: 'Preparing' | 'Queueing' | 'Processing' | 'Success' | 'Fail';
  file_id?: string;
  video_width?: number;
  video_height?: number;
  error_message?: string;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

interface VideoFileResult {
  file?: {
    file_id?: string;
    bytes?: number;
    filename?: string;
    purpose?: string;
    download_url?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

interface LyricsGenerationResult {
  song_title?: string;
  style_tags?: string;
  lyrics?: string;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

interface MusicGenerationResult {
  data?: {
    audio_data_url?: string;
    audio_url?: string;
    status?: number;
  };
  trace_id?: string;
  extra_info?: {
    music_duration?: number;
    music_sample_rate?: number;
    music_channel?: number;
    bitrate?: number;
    music_size?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

const IndexPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [activeModel, setActiveModel] = useState<ModelItem | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatAbortController, setChatAbortController] = useState<AbortController | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [editingModel, setEditingModel] = useState<ModelItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [form] = Form.useForm();
  const [chatForm] = Form.useForm();
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const typewriterTimerRef = useRef<number | null>(null);
  const typewriterQueueRef = useRef<string>('');
  const currentTypewriterMessageIdRef = useRef<string>('');

  // 站点相关状态
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [siteLoading, setSiteLoading] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [siteFormVisible, setSiteFormVisible] = useState(false);
  const [siteForm] = Form.useForm();

  // 图片生成相关状态
  const [imageForm] = Form.useForm();
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageResult, setImageResult] = useState<ImageGenerationResult | null>(null);
  const [imageError, setImageError] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<'t2i' | 'i2i'>('t2i');

  const imageModels = useMemo(
    () => models.filter((m) => ['image-01', 'image-01-live'].includes(String(m.type || '').trim())),
    [models],
  );

  // 语音合成相关状态
  const [speechForm] = Form.useForm();
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [speechLoading, setSpeechLoading] = useState(false);
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [speechResult, setSpeechResult] = useState<SpeechSynthesisResult | null>(null);
  const [speechError, setSpeechError] = useState('');

  // 视频生成相关状态
  const [videoForm] = Form.useForm();
  const [videoMode, setVideoMode] = useState<'t2v' | 'i2v'>('t2v');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoPolling, setVideoPolling] = useState(false);
  const [videoTask, setVideoTask] = useState<VideoTaskResult | null>(null);
  const [videoFile, setVideoFile] = useState<VideoFileResult | null>(null);
  const [videoError, setVideoError] = useState('');
  const [firstFramePreview, setFirstFramePreview] = useState('');

  // 音乐生成相关状态
  const [musicForm] = Form.useForm();
  const [lyricsMode, setLyricsMode] = useState<'write_full_song' | 'edit'>('write_full_song');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [lyricsResult, setLyricsResult] = useState<LyricsGenerationResult | null>(null);
  const [musicResult, setMusicResult] = useState<MusicGenerationResult | null>(null);
  const [musicError, setMusicError] = useState('');

  const minimaxModels = useMemo(
    () =>
      models.filter((m) =>
        [m.name, m.endpoint, m.type].some((value) =>
          String(value || '').toLowerCase().includes('minimax'),
        ),
      ),
    [models],
  );

  const fetchSites = async () => {
    setSiteLoading(true);
    try {
      const res = await axios.get('/api/v1/sites/get');
      const data = res.data?.data as SiteListResponse;
      setSites(data?.list || []);
    } catch (e: any) {
      message.error(e?.response?.data?.msg || '获取站点列表失败');
    } finally {
      setSiteLoading(false);
    }
  };

  const openCreateSite = () => {
    setEditingSite(null);
    siteForm.resetFields();
    setSiteFormVisible(true);
  };

  const openEditSite = (site: SiteItem) => {
    setEditingSite(site);
    siteForm.setFieldsValue({
      site_name: site.site_name,
    });
    setSiteFormVisible(true);
  };

  const handleSaveSite = async () => {
    try {
      const values = await siteForm.validateFields();
      if (editingSite) {
        await axios.put(`/api/v1/sites/${editingSite.site_id}`, values);
        message.success('已更新站点');
      } else {
        await axios.post('/api/v1/sites/create', values);
        message.success('已创建站点');
      }
      setSiteFormVisible(false);
      await fetchSites();
    } catch {
      // ignore
    }
  };

  const handleDeleteSite = (site: SiteItem) => {
    Modal.confirm({
      title: '删除站点',
      content: `确认删除站点「${site.site_name || site.site_id}」？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await axios.delete(`/api/v1/sites/${site.site_id}`);
          message.success('删除成功');
          await fetchSites();
        } catch (e: any) {
          message.error(e?.response?.data?.msg || '删除失败');
        }
      },
    });
  };

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/models/get', {
        params: { page: 1, page_size: 100 },
      });
      const data = res.data?.data as ModelListResponse;
      const list = data.list || [];
      setModels(list);
      if (!activeModel && list.length > 0) {
        setActiveModel(list[0]);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.msg || '获取模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Alex_yehui 控制台';
    fetchModels();
    fetchSites();
  }, []);

  useEffect(() => {
    if (imageModels.length > 0 && !imageForm.getFieldValue('model_id')) {
      imageForm.setFieldValue('model_id', imageModels[0].model_id);
    }
  }, [imageModels, imageForm]);

  useEffect(() => {
    if (minimaxModels.length > 0 && !speechForm.getFieldValue('model_id')) {
      speechForm.setFieldValue('model_id', minimaxModels[0].model_id);
    }
  }, [minimaxModels, speechForm]);

  useEffect(() => {
    if (minimaxModels.length > 0 && !videoForm.getFieldValue('model_id')) {
      videoForm.setFieldValue('model_id', minimaxModels[0].model_id);
    }
  }, [minimaxModels, videoForm]);

  useEffect(() => {
    if (minimaxModels.length > 0 && !musicForm.getFieldValue('model_id')) {
      musicForm.setFieldValue('model_id', minimaxModels[0].model_id);
    }
  }, [minimaxModels, musicForm]);

  useEffect(() => {
    if (!chatVisible) return;
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages, chatStreaming, chatVisible]);

  const stats = useMemo(() => {
    const total = models.length;
    const ready = models.filter((m) => m.endpoint).length;
    return { total, ready };
  }, [models]);

  const openCreate = () => {
    setEditingModel(null);
    form.resetFields();
    setFormVisible(true);
  };

  const openEdit = (m: ModelItem) => {
    setEditingModel(m);
    form.resetFields();
    const protocol = m.endpoint?.match(/^https?:\/\//)?.[0] || 'https://';
    const displayEndpoint = m.endpoint?.replace(/^https?:\/\//, '') || '';
    form.setFieldsValue({
      name: m.name,
      protocol,
      endpoint: displayEndpoint,
      api_key: undefined,
      timeout: m.timeout,
      type: m.type,
      dimensions: m.dimensions,
    });
    setFormVisible(true);
  };

  const handleSaveModel = async () => {
    try {
      const values = await form.validateFields();
      const { protocol, ...rest } = values;
      const endpoint = String(rest.endpoint || '').trim();
      const hasProtocol = /^https?:\/\//i.test(endpoint);
      const finalValues = {
        ...rest,
        endpoint: hasProtocol ? endpoint : `${protocol || 'https://'}${endpoint}`,
      };
      if (editingModel && !String(finalValues.api_key || '').trim()) {
        delete finalValues.api_key;
      }
      if (editingModel) {
        await axios.put(`/api/v1/models/${editingModel.model_id}`, finalValues);
        message.success('已更新模型');
      } else {
        await axios.post('/api/v1/models/create', finalValues);
        message.success('已创建模型');
      }
      setFormVisible(false);
      await fetchModels();
    } catch {
      // ignore
    }
  };

  const handleDelete = (m: ModelItem) => {
    Modal.confirm({
      title: '删除模型',
      content: `确认删除模型「${m.name}」？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await axios.delete(`/api/v1/models/${m.model_id}`);
          message.success('删除成功');
          if (activeModel?.model_id === m.model_id) {
            setActiveModel(null);
            setChatMessages([]);
            chatForm.resetFields();
          }
          await fetchModels();
        } catch (e: any) {
          message.error(e?.response?.data?.msg || '删除失败');
        }
      },
    });
  };

  const openChatWithModel = (m: ModelItem) => {
    setActiveModel(m);
    setChatVisible(true);
    setChatMessages([]);
    setChatStreaming(false);
    setLastUserMessage('');
    chatForm.resetFields();
  };

  const closeChat = () => {
    if (chatAbortController) {
      chatAbortController.abort();
    }
    if (typewriterTimerRef.current) {
      window.clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    setChatVisible(false);
    setChatStreaming(false);
    setChatLoading(false);
  };

  const stopStreaming = () => {
    if (chatAbortController) {
      chatAbortController.abort();
    }
    if (typewriterTimerRef.current) {
      window.clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    typewriterQueueRef.current = '';
    currentTypewriterMessageIdRef.current = '';
    setChatStreaming(false);
    setChatLoading(false);
  };

  const appendAssistantText = (messageId: string, text: string) => {
    if (!text) return;
    // 如果是新的消息，开始新的打字机序列
    if (messageId !== currentTypewriterMessageIdRef.current) {
      typewriterQueueRef.current = '';
      currentTypewriterMessageIdRef.current = messageId;
    }
    // 将新文本加入队列
    typewriterQueueRef.current += text;
    // 启动定时器逐字显示（如果还没启动）
    if (!typewriterTimerRef.current) {
      typewriterTimerRef.current = window.setInterval(() => {
        if (!typewriterQueueRef.current) {
          if (typewriterTimerRef.current) {
            window.clearInterval(typewriterTimerRef.current);
            typewriterTimerRef.current = null;
          }
          return;
        }
        // 每次只取一个字符，避免竞态
        const char = typewriterQueueRef.current[0];
        typewriterQueueRef.current = typewriterQueueRef.current.slice(1);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === currentTypewriterMessageIdRef.current
              ? { ...m, content: `${m.content}${char}` }
              : m,
          ),
        );
      }, 15);
    }
  };

  const setAssistantText = (messageId: string, text: string) => {
    setChatMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: text } : m)),
    );
  };

  const startTypewriter = (messageId: string, text: string) => {
    if (typewriterTimerRef.current) {
      window.clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    // 使用队列系统实现打字机效果
    currentTypewriterMessageIdRef.current = messageId;
    typewriterQueueRef.current = text;
    typewriterTimerRef.current = window.setInterval(() => {
      if (!typewriterQueueRef.current) {
        if (typewriterTimerRef.current) {
          window.clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
        return;
      }
      // 每次只取一个字符，避免竞态
      const char = typewriterQueueRef.current[0];
      typewriterQueueRef.current = typewriterQueueRef.current.slice(1);
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: `${m.content}${char}` }
            : m,
        ),
      );
    }, 15);
  };

  const buildMessagesPayload = (messages: ChatMessage[]) =>
    messages
      .filter((m) => m.content.trim())
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

  const stripThinkingText = (text: string) =>
    text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^\s*<\/?think>\s*$/gim, '')
      .trimStart();

  const extractDisplayContent = (parsed: any) => {
    const choice = parsed?.choices?.[0];
    const content =
      choice?.delta?.content ??
      choice?.message?.content ??
      parsed?.text ??
      parsed?.content ??
      '';
    if (typeof content === 'string' && content) {
      return stripThinkingText(content);
    }
    if (parsed?.type === 'content_block_delta' && parsed?.delta?.type === 'text_delta') {
      return stripThinkingText(String(parsed.delta.text || ''));
    }
    if (Array.isArray(parsed?.content)) {
      return stripThinkingText(
        parsed.content
          .filter((item: any) => item?.type === 'text' && typeof item?.text === 'string')
          .map((item: any) => item.text)
          .join(''),
      );
    }
    return '';
  };

  const extractDisplayContentFromRaw = (rawText: string) => {
    const dataLines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s*/, '').trim())
      .filter((line) => line && line !== '[DONE]');

    const pieces: string[] = [];
    for (const line of dataLines) {
      try {
        const content = extractDisplayContent(JSON.parse(line));
        if (content) pieces.push(content);
      } catch {
        // Ignore malformed stream fragments instead of showing raw JSON.
      }
    }
    if (pieces.length > 0) {
      return pieces.join('');
    }

    try {
      return extractDisplayContent(JSON.parse(rawText));
    } catch {
      return stripThinkingText(rawText);
    }
  };

  const handleChat = async () => {
    if (!activeModel) {
      message.warning('请先选择一个模型');
      return;
    }
    try {
      const values = await chatForm.validateFields();
      const content = (values.message || '').trim();
      if (!content) return;
      if (chatAbortController) {
        chatAbortController.abort();
      }
      const abortController = new AbortController();
      setChatAbortController(abortController);
      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        content,
      };
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
      };
      const nextMessages = [...chatMessages, userMessage];
      const payloadMessages = buildMessagesPayload(nextMessages);
      setChatMessages((prev) => [...prev, userMessage, assistantMessage]);
      chatForm.resetFields();
      setLastUserMessage(content);
      setChatLoading(true);
      setChatStreaming(true);

      const resp = await fetch(
        `/api/v1/models/chat/${activeModel.model_id}?stream=1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: payloadMessages }),
          signal: abortController.signal,
        },
      );

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || '对话失败');
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        const text = await resp.text();
        setAssistantText(assistantMessage.id, text);
        setChatStreaming(false);
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let rawText = '';
      let receivedTokens = false;
      let doneFromServer = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        rawText += chunk;
        buffer += chunk;
        let lineBreakIndex = buffer.indexOf('\n');
        while (lineBreakIndex >= 0) {
          const line = buffer.slice(0, lineBreakIndex).trimEnd();
          buffer = buffer.slice(lineBreakIndex + 1);
          if (line.startsWith('data:')) {
            const data = line.replace(/^data:\s*/, '').trim();
            if (data === '[DONE]') {
              doneFromServer = true;
              break;
            }
            try {
              const delta = extractDisplayContent(JSON.parse(data));
              if (delta) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, delta);
              }
            } catch {
              const text = stripThinkingText(data);
              if (text && !/^\{[\s\S]*\}$/.test(text)) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, text);
              }
            }
          }
          lineBreakIndex = buffer.indexOf('\n');
        }
        if (doneFromServer) break;
      }
      if (!receivedTokens && rawText) {
        startTypewriter(assistantMessage.id, extractDisplayContentFromRaw(rawText));
      }
      setChatStreaming(false);
    } catch (e: any) {
      message.error(e?.message || '对话失败');
      setChatStreaming(false);
      if (e?.name === 'AbortError') return;
    } finally {
      setChatLoading(false);
      setChatAbortController(null);
    }
  };

  const handleRegenerate = async () => {
    if (!activeModel || !lastUserMessage) {
      message.warning('没有可重新生成的内容');
      return;
    }
    if (chatStreaming) {
      stopStreaming();
      return;
    }
    const trimmedMessages = [...chatMessages];
    if (trimmedMessages.length > 0 && trimmedMessages[trimmedMessages.length - 1].role === 'assistant') {
      trimmedMessages.pop();
    }
    const payloadMessages = buildMessagesPayload(trimmedMessages);
    const assistantMessage: ChatMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: '',
    };
    setChatMessages((prev) => [...trimmedMessages, assistantMessage]);
    setChatStreaming(true);
    setChatLoading(true);
    const abortController = new AbortController();
    setChatAbortController(abortController);
    try {
      const resp = await fetch(
        `/api/v1/models/chat/${activeModel.model_id}?stream=1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: payloadMessages }),
          signal: abortController.signal,
        },
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || '对话失败');
      }
      const reader = resp.body?.getReader();
      if (!reader) {
        const text = await resp.text();
        setAssistantText(assistantMessage.id, text);
        setChatStreaming(false);
        return;
      }
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let rawText = '';
      let receivedTokens = false;
      let doneFromServer = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        rawText += chunk;
        buffer += chunk;
        let lineBreakIndex = buffer.indexOf('\n');
        while (lineBreakIndex >= 0) {
          const line = buffer.slice(0, lineBreakIndex).trimEnd();
          buffer = buffer.slice(lineBreakIndex + 1);
          if (line.startsWith('data:')) {
            const data = line.replace(/^data:\s*/, '').trim();
            if (data === '[DONE]') {
              doneFromServer = true;
              break;
            }
            try {
              const delta = extractDisplayContent(JSON.parse(data));
              if (delta) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, delta);
              }
            } catch {
              const text = stripThinkingText(data);
              if (text && !/^\{[\s\S]*\}$/.test(text)) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, text);
              }
            }
          }
          lineBreakIndex = buffer.indexOf('\n');
        }
        if (doneFromServer) break;
      }
      if (!receivedTokens && rawText) {
        startTypewriter(assistantMessage.id, extractDisplayContentFromRaw(rawText));
      }
      setChatStreaming(false);
    } catch (e: any) {
      message.error(e?.message || '对话失败');
      setChatStreaming(false);
      if (e?.name === 'AbortError') return;
    } finally {
      setChatLoading(false);
      setChatAbortController(null);
    }
  };

  const handleGenerateImage = async () => {
    try {
      const values = await imageForm.validateFields();
      const modelId = values.model_id;
      if (!modelId) {
        message.warning('请先选择 MiniMax 图片模型');
        return;
      }
      setImageGenerating(true);
      setImageError('');
      setImageResult(null);
      const payload: any = {
        mode: imageMode,
        prompt: String(values.prompt || '').trim(),
        aspect_ratio: values.aspect_ratio || '1:1',
        n: values.n || 1,
        response_format: values.response_format || 'url',
        prompt_optimizer: Boolean(values.prompt_optimizer),
        aigc_watermark: Boolean(values.aigc_watermark),
      };
      if (imageMode === 'i2i') {
        payload.image_file = String(values.image_file || '').trim();
      }
      if (values.seed !== undefined && values.seed !== null && values.seed !== '') {
        payload.seed = Number(values.seed);
      }
      const res = await axios.post(`/api/v1/models/image-generation/${modelId}`, payload);
      const result = res.data?.data as ImageGenerationResult;
      const statusCode = result?.base_resp?.status_code;
      if (typeof statusCode === 'number' && statusCode !== 0) {
        throw new Error(result?.base_resp?.status_msg || '图片生成失败');
      }
      setImageResult(result);
      message.success('图片生成完成');
    } catch (e: any) {
      const msg =
        e?.response?.data?.msg ||
        e?.response?.data?.detail ||
        e?.message ||
        '图片生成失败';
      setImageError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      message.error('图片生成失败');
    } finally {
      setImageGenerating(false);
    }
  };

  const generatedImages = useMemo(() => {
    const urls = imageResult?.data?.image_urls || [];
    const base64Items = imageResult?.data?.image_base64 || [];
    return [
      ...urls.map((url) => ({ type: 'url' as const, src: url })),
      ...base64Items.map((item) => ({
        type: 'base64' as const,
        src: item.startsWith('data:') ? item : `data:image/png;base64,${item}`,
      })),
    ];
  }, [imageResult]);

  const downloadImage = async (src: string, index: number) => {
    const filename = `minimax-image-${Date.now()}-${index + 1}.png`;
    try {
      if (src.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = src;
        link.download = filename;
        link.click();
        return;
      }

      const resp = await fetch(src);
      if (!resp.ok) {
        throw new Error('图片下载失败');
      }
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      message.error(e?.message || '图片下载失败');
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('图片读取失败'));
      reader.readAsDataURL(file);
    });

  const handleReferenceImageUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('仅支持 JPG、PNG、WebP 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('参考图片不能超过 10MB');
      return Upload.LIST_IGNORE;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      imageForm.setFieldValue('image_file', dataUrl);
      setReferenceImageUrl(dataUrl);
      setImageError('');
      message.success('本地图片已载入');
    } catch (e: any) {
      message.error(e?.message || '图片读取失败');
    }
    return Upload.LIST_IGNORE;
  };

  const flattenVoices = (data: any): VoiceItem[] =>
    (['voice_cloning', 'voice_generation', 'system_voice', 'music_generation'] as const).flatMap(
      (source) =>
        (data?.[source] || []).map((item: any) => ({
          ...item,
          source,
        })),
    );

  const fetchVoices = async (modelId?: string) => {
    const targetModelId = modelId || speechForm.getFieldValue('model_id');
    if (!targetModelId) {
      message.warning('请先选择 MiniMax API 配置');
      return;
    }
    setVoiceLoading(true);
    setSpeechError('');
    try {
      const res = await axios.post(`/api/v1/models/voices/${targetModelId}`, {
        voice_type: 'all',
      });
      const list = flattenVoices(res.data?.data);
      setVoices(list);
      if (list.length > 0 && !speechForm.getFieldValue('voice_id')) {
        const clonedVoice = list.find((item) => item.source === 'voice_cloning');
        speechForm.setFieldValue('voice_id', (clonedVoice || list[0]).voice_id);
      }
      message.success('音色列表已更新');
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || '获取音色列表失败';
      setSpeechError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      message.error('获取音色列表失败');
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleSynthesizeSpeech = async () => {
    try {
      const values = await speechForm.validateFields();
      setSpeechLoading(true);
      setSpeechError('');
      setSpeechResult(null);
      const payload = {
        text: String(values.text || '').trim(),
        voice_id: values.voice_id,
        model: values.speech_model || 'speech-2.8-hd',
        speed: values.speed ?? 1,
        vol: values.vol ?? 1,
        pitch: values.pitch ?? 0,
        emotion: values.emotion || undefined,
        sample_rate: values.sample_rate || 32000,
        bitrate: values.bitrate || 128000,
        audio_format: values.audio_format || 'mp3',
        channel: values.channel || 1,
        language_boost: values.language_boost || undefined,
      };
      const res = await axios.post(`/api/v1/models/speech/${values.model_id}`, payload);
      const result = res.data?.data as SpeechSynthesisResult;
      const statusCode = result?.base_resp?.status_code;
      if (typeof statusCode === 'number' && statusCode !== 0) {
        throw new Error(result?.base_resp?.status_msg || '语音合成失败');
      }
      setSpeechResult(result);
      message.success('语音合成完成');
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || '语音合成失败';
      setSpeechError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      message.error('语音合成失败');
    } finally {
      setSpeechLoading(false);
    }
  };

  const downloadSpeechAudio = () => {
    const src = speechResult?.data?.audio_data_url;
    if (!src) return;
    const format = speechResult.extra_info?.audio_format || speechForm.getFieldValue('audio_format') || 'mp3';
    const link = document.createElement('a');
    link.href = src;
    link.download = `minimax-speech-${Date.now()}.${format}`;
    link.click();
  };

  const handleFirstFrameUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('仅支持 JPG、PNG、WebP 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error('首帧图片不能超过 20MB');
      return Upload.LIST_IGNORE;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      videoForm.setFieldValue('first_frame_image', dataUrl);
      setFirstFramePreview(dataUrl);
      setVideoError('');
      message.success('首帧图片已载入');
    } catch (e: any) {
      message.error(e?.message || '图片读取失败');
    }
    return Upload.LIST_IGNORE;
  };

  const retrieveVideoFile = async (modelId: string, fileId: string) => {
    const res = await axios.get(`/api/v1/models/video/${modelId}/files/${fileId}`);
    if (res.data?.status !== 200) {
      throw new Error(res.data?.msg || '查询视频文件失败');
    }
    const result = res.data?.data as VideoFileResult | null;
    if (!result?.file?.download_url) {
      throw new Error('未返回视频下载地址');
    }
    setVideoFile(result);
    return result;
  };

  const pollVideoTask = async (modelId: string, taskId: string) => {
    setVideoPolling(true);
    setVideoError('');
    try {
      for (let i = 0; i < 90; i += 1) {
        const res = await axios.get(`/api/v1/models/video/${modelId}/tasks/${taskId}`);
        if (res.data?.status !== 200) {
          throw new Error(res.data?.msg || '视频任务状态查询失败');
        }
        const task = res.data?.data as VideoTaskResult | null;
        if (!task) {
          throw new Error('视频任务状态为空');
        }
        setVideoTask(task);
        if (task.status === 'Success' && task.file_id) {
          await retrieveVideoFile(modelId, task.file_id);
          message.success('视频生成完成');
          return;
        }
        if (task.status === 'Fail') {
          throw new Error(task.error_message || '视频生成失败');
        }
        await new Promise((resolve) => window.setTimeout(resolve, 10000));
      }
      throw new Error('视频仍在生成中，请稍后用 task_id 查询');
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || '视频任务查询失败';
      setVideoError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      message.error('视频任务查询失败');
    } finally {
      setVideoPolling(false);
    }
  };

  const handleCreateVideo = async () => {
    try {
      const values = await videoForm.validateFields();
      setVideoLoading(true);
      setVideoError('');
      setVideoTask(null);
      setVideoFile(null);
      const payload: any = {
        mode: videoMode,
        prompt: String(values.prompt || '').trim(),
        model: values.video_model || 'MiniMax-Hailuo-2.3',
        duration: values.duration || 6,
        resolution: values.resolution || '768P',
      };
      if (values.prompt_optimizer) {
        payload.prompt_optimizer = true;
      }
      if (values.fast_pretreatment) {
        payload.fast_pretreatment = true;
      }
      if (values.aigc_watermark) {
        payload.aigc_watermark = true;
      }
      if (videoMode === 'i2v') {
        payload.first_frame_image = String(values.first_frame_image || '').trim();
      }
      const res = await axios.post(`/api/v1/models/video/${values.model_id}`, payload);
      if (res.data?.status !== 200) {
        throw new Error(res.data?.msg || '视频任务创建失败');
      }
      const task = res.data?.data as VideoTaskResult | null;
      if (!task?.task_id) {
        throw new Error('未返回 task_id');
      }
      setVideoTask(task);
      videoForm.setFieldValue('task_id', task.task_id);
      message.success('视频任务已创建');
      pollVideoTask(values.model_id, task.task_id);
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || '视频任务创建失败';
      setVideoError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      message.error('视频任务创建失败');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleQueryVideoTask = async () => {
    try {
      const values = await videoForm.validateFields(['model_id', 'task_id']);
      if (!values.task_id) {
        message.warning('请输入 task_id');
        return;
      }
      setVideoFile(null);
      await pollVideoTask(values.model_id, values.task_id);
    } catch {
      // Form validation already shows the reason.
    }
  };

  const downloadVideo = async () => {
    const url = videoFile?.file?.download_url;
    if (!url) return;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error('视频下载失败');
      }
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = videoFile.file?.filename || `minimax-video-${Date.now()}.mp4`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      message.error(e?.message || '视频下载失败');
    }
  };

  const handleGenerateLyrics = async () => {
    try {
      const values = await musicForm.validateFields(['model_id', 'lyrics_prompt']);
      if (lyricsMode === 'edit') {
        await musicForm.validateFields(['lyrics']);
      }
      setLyricsLoading(true);
      setMusicError('');
      const payload = {
        mode: lyricsMode,
        prompt: values.lyrics_prompt || '',
        lyrics: lyricsMode === 'edit' ? musicForm.getFieldValue('lyrics') : undefined,
        title: musicForm.getFieldValue('song_title') || undefined,
      };
      const res = await axios.post(`/api/v1/models/lyrics/${values.model_id}`, payload);
      const result = res.data?.data as LyricsGenerationResult;
      setLyricsResult(result);
      musicForm.setFieldsValue({
        song_title: result.song_title,
        style_tags: result.style_tags,
        lyrics: result.lyrics,
        music_prompt: result.style_tags || musicForm.getFieldValue('music_prompt'),
      });
      message.success('歌词生成完成');
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || '歌词生成失败';
      setMusicError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      message.error('歌词生成失败');
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleGenerateMusic = async () => {
    try {
      const values = await musicForm.validateFields(['model_id', 'music_model', 'music_prompt']);
      const isInstrumental = Boolean(musicForm.getFieldValue('is_instrumental'));
      if (!isInstrumental && !musicForm.getFieldValue('lyrics_optimizer')) {
        await musicForm.validateFields(['lyrics']);
      }
      setMusicLoading(true);
      setMusicError('');
      setMusicResult(null);
      const payload = {
        model: values.music_model || 'music-2.6',
        prompt: values.music_prompt || '',
        lyrics: musicForm.getFieldValue('lyrics') || undefined,
        lyrics_optimizer: Boolean(musicForm.getFieldValue('lyrics_optimizer')),
        is_instrumental: isInstrumental,
        sample_rate: musicForm.getFieldValue('sample_rate') || 44100,
        bitrate: musicForm.getFieldValue('bitrate') || 256000,
        audio_format: musicForm.getFieldValue('audio_format') || 'mp3',
        output_format: 'hex',
        aigc_watermark: Boolean(musicForm.getFieldValue('aigc_watermark')),
      };
      const res = await axios.post(`/api/v1/models/music/${values.model_id}`, payload);
      const result = res.data?.data as MusicGenerationResult;
      setMusicResult(result);
      message.success('歌曲生成完成');
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || '歌曲生成失败';
      setMusicError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      message.error('歌曲生成失败');
    } finally {
      setMusicLoading(false);
    }
  };

  const downloadMusicAudio = () => {
    const src = musicResult?.data?.audio_data_url || musicResult?.data?.audio_url;
    if (!src) return;
    const format = musicForm.getFieldValue('audio_format') || 'mp3';
    const title = musicForm.getFieldValue('song_title') || 'minimax-music';
    const link = document.createElement('a');
    link.href = src;
    link.download = `${title}-${Date.now()}.${format}`;
    link.click();
  };

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, #f5f5f7 0, #ffffff 45%, #f5f5f7 100%)',
      }}
    >
      <Header
        style={{
          height: 64,
          lineHeight: '64px',
          padding: '0 56px',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        }}
      >
        <Space size={16}>
          <RobotOutlined style={{ fontSize: 22, color: '#111' }} />
          <Text style={{ fontSize: 18, fontWeight: 600 }}>Alex_yehui</Text>
        </Space>
      </Header>

      <Content style={{ padding: '24px 56px 56px' }}>
        {/* Hero section */}
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto 40px',
            textAlign: 'center',
          }}
        >
          <Title
            level={1}
            style={{
              marginBottom: 16,
              fontSize: 44,
              letterSpacing: 0.4,
              fontWeight: 600,
              color: '#111',
            }}
          >
            欢迎管理 Alex_yehui 的主页。
          </Title>
          <Title
            level={4}
            style={{
              marginBottom: 32,
              fontWeight: 400,
              color: '#6e6e73',
            }}
          >
            这里是我的个人空间，用来集中展示我的工作、项目和正在折腾的各种 AI / 工具实验。
          </Title>
          <Space size={16} style={{ justifyContent: 'center' }}>
            <Button
              type="primary"
              size="large"
              shape="round"
              icon={<ArrowRightOutlined />}
              onClick={() => window.open('https://hexo.ismyh.cn/', '_blank')}
            >
              打开我的博客
            </Button>
            <Text style={{ color: '#6e6e73' }}>
              当前为主页挂载了 <strong>{stats.total}</strong> 个模型工具，其中{' '}
              <strong>{stats.ready}</strong> 个可直接对话。
            </Text>
          </Space>
        </div>

        {/* Main content with tabs (欢迎 / 模型管理) */}
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
          }}
        >
          <Tabs
            defaultActiveKey="welcome"
            items={[
              {
                key: 'welcome',
                label: '欢迎',
                children: (
                  <Row gutter={24}>
                    <Col xs={24} md={12} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        style={{
                          borderRadius: 24,
                          background: 'rgba(255,255,255,0.9)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                        }}
                      >
                        <Title level={4} style={{ marginBottom: 12 }}>
                          关于我
                        </Title>
                        <Paragraph style={{ color: '#6e6e73' }}>
                          这里是 Alex_yehui 的个人主页，记录一些正在做的事情、想法，以及和 AI
                          相关的尝试。
                        </Paragraph>
                      </Card>
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        style={{
                          borderRadius: 24,
                          background: 'rgba(255,255,255,0.9)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                        }}
                      >
                        <Title level={4} style={{ marginBottom: 12 }}>
                          工作与项目
                        </Title>
                        <Paragraph style={{ color: '#6e6e73' }}>
                          主要关注后端 / 基础设施与 AI 应用落地，页面后续可以放一些代表性的项目链接和截图。
                        </Paragraph>
                      </Card>
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        style={{
                          borderRadius: 24,
                          background: 'rgba(255,255,255,0.9)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                        }}
                      >
                        <Title level={4} style={{ marginBottom: 12 }}>
                          随笔与笔记
                        </Title>
                        <Paragraph style={{ color: '#6e6e73' }}>
                          我的主要博客位于{' '}
                          <a href="https://hexo.ismyh.cn/" target="_blank" rel="noreferrer">
                            https://hexo.ismyh.cn/
                          </a>
                          ，后续也会在这里挂一些精选文章和长文链接。
                        </Paragraph>
                      </Card>
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        style={{
                          borderRadius: 24,
                          background: 'rgba(255,255,255,0.9)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                        }}
                      >
                        <Title level={4} style={{ marginBottom: 12 }}>
                          工具与实验室
                        </Title>
                        <Paragraph style={{ color: '#6e6e73' }}>
                          模型管理只是其中一个小模块，后续可以继续放更多实验性的工具，比如自动化脚本面板、数据看板等。
                        </Paragraph>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'models',
                label: '模型管理',
                children: (
                  <Row gutter={24} align="stretch">
                    <Col xs={24} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          borderRadius: 28,
                          background:
                            'linear-gradient(135deg, rgba(250,250,252,0.9), rgba(245,245,247,0.9))',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space direction="vertical" size={4}>
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              模型一览
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                              以卡片的形式浏览和管理你接入的每一个模型。
                            </Text>
                          </Space>
                        }
                        extra={
                          <Space>
                            <Button type="link" onClick={fetchModels} style={{ paddingRight: 0 }}>
                              刷新
                            </Button>
                            <Button
                              type="primary"
                              shape="round"
                              icon={<PlusOutlined />}
                              onClick={openCreate}
                            >
                              新建模型
                            </Button>
                          </Space>
                        }
                      >
                        {models.length === 0 ? (
                          <div style={{ padding: '40px 0' }}>
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={
                                <span style={{ color: '#6e6e73' }}>
                                  还没有模型。点击右上角「新建模型」开始接入。
                                </span>
                              }
                            />
                          </div>
                        ) : (
                          <Row gutter={[16, 16]}>
                            {models.map((m) => {
                              const isActive = activeModel?.model_id === m.model_id;
                              return (
                                <Col xs={24} md={12} key={m.model_id}>
                                  <Card
                                    hoverable
                                    onClick={() => setActiveModel(m)}
                                    bordered={false}
                                    style={{
                                      borderRadius: 22,
                                      background: isActive
                                        ? 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)'
                                        : 'rgba(255,255,255,0.9)',
                                      color: isActive ? '#003eb3' : '#111',
                                      boxShadow: isActive
                                        ? '0 18px 40px rgba(0,102,255,0.25)'
                                        : '0 10px 30px rgba(0,0,0,0.06)',
                                      transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                                      transition: 'all 0.25s ease',
                                      border: isActive ? '2px solid #69a6ff' : '2px solid transparent',
                                    }}
                                    bodyStyle={{ padding: 18 }}
                                  >
                                    <Space
                                      align="start"
                                      style={{ width: '100%', justifyContent: 'space-between' }}
                                    >
                                      <Space align="start">
                                        <div
                                          style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: isActive
                                              ? '#1890ff'
                                              : '#f5f5f7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <RobotOutlined
                                            style={{
                                              fontSize: 16,
                                              color: isActive ? '#fff' : '#111',
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Text
                                            style={{
                                              fontWeight: 600,
                                              fontSize: 16,
                                              color: isActive ? '#003eb3' : '#111',
                                            }}
                                          >
                                            {m.name}
                                          </Text>
                                          <div style={{ marginTop: 6 }}>
                                            {m.type ? (
                                              <Tag
                                                color={isActive ? 'processing' : 'blue'}
                                                style={{
                                                  borderRadius: 999,
                                                  border: 'none',
                                                }}
                                              >
                                                {m.type}
                                              </Tag>
                                            ) : (
                                              <Tag
                                                style={{
                                                  borderRadius: 999,
                                                  border: 'none',
                                                  background: '#f0f0f0',
                                                }}
                                              >
                                                未设置类型
                                              </Tag>
                                            )}
                                          </div>
                                        </div>
                                      </Space>
                                      <Space size={8}>
                                        <Tooltip title="对话">
                                          <Button
                                            size="small"
                                            type={isActive ? 'primary' : 'default'}
                                            shape="round"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openChatWithModel(m);
                                            }}
                                          >
                                            对话
                                          </Button>
                                        </Tooltip>
                                        <Tooltip title="编辑">
                                          <Button
                                            size="small"
                                            type={isActive ? 'default' : 'text'}
                                            icon={<EditOutlined />}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEdit(m);
                                            }}
                                          />
                                        </Tooltip>
                                        <Tooltip title="删除">
                                          <Button
                                            size="small"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(m);
                                            }}
                                          />
                                        </Tooltip>
                                      </Space>
                                    </Space>

                                    <Paragraph
                                      style={{
                                        marginTop: 12,
                                        marginBottom: 8,
                                        fontSize: 12,
                                        color: isActive ? '#595959' : '#6e6e73',
                                      }}
                                      ellipsis={{ rows: 2 }}
                                    >
                                      {m.endpoint}
                                    </Paragraph>
                                    <Space size={16} style={{ fontSize: 11 }}>
                                      <span style={{ color: isActive ? '#595959' : '#6e6e73' }}>
                                        维度 {m.dimensions ?? '-'}
                                      </span>
                                      <span style={{ color: isActive ? '#595959' : '#6e6e73' }}>
                                        超时 {m.timeout ?? '-'}s
                                      </span>
                                    </Space>
                                  </Card>
                                </Col>
                              );
                            })}
                          </Row>
                        )}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'image-generation',
                label: '图片生成',
                children: (
                  <Row gutter={24} align="stretch">
                    <Col xs={24} lg={10} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space align="center">
                            <PictureOutlined style={{ fontSize: 18 }} />
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              MiniMax 图片生成
                            </Text>
                          </Space>
                        }
                      >
                        <Form
                          form={imageForm}
                          layout="vertical"
                          initialValues={{
                            model_id: imageModels[0]?.model_id,
                            aspect_ratio: '1:1',
                            n: 1,
                            response_format: 'url',
                            prompt_optimizer: false,
                            aigc_watermark: false,
                          }}
                        >
                          <Form.Item label="生成模式">
                            <Segmented
                              block
                              value={imageMode}
                              options={[
                                { label: '文生图', value: 't2i' },
                                { label: '图生图', value: 'i2i' },
                              ]}
                              onChange={(value) => {
                                const nextMode = value as 't2i' | 'i2i';
                                setImageMode(nextMode);
                                setImageError('');
                                setImageResult(null);
                                if (nextMode === 't2i') {
                                  imageForm.setFieldValue('image_file', undefined);
                                  setReferenceImageUrl('');
                                }
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            label="图片模型"
                            name="model_id"
                            rules={[{ required: true, message: '请选择图片模型' }]}
                          >
                            <Select
                              placeholder="先在模型管理中添加 image-01 / image-01-live"
                              options={imageModels.map((m) => ({
                                value: m.model_id,
                                label: `${m.name} (${m.type})`,
                              }))}
                              notFoundContent="暂无 MiniMax 图片模型"
                            />
                          </Form.Item>
                          {imageMode === 'i2i' ? (
                            <Form.Item
                              label="参考图片"
                              required
                            >
                              <Space.Compact style={{ width: '100%' }}>
                                <Upload
                                  accept="image/jpeg,image/png,image/webp"
                                  showUploadList={false}
                                  beforeUpload={handleReferenceImageUpload}
                                >
                                  <Button icon={<UploadOutlined />}>上传</Button>
                                </Upload>
                                <Form.Item
                                  name="image_file"
                                  noStyle
                                  rules={[{ required: true, message: '请上传或输入参考图片' }]}
                                >
                                  <Input
                                    placeholder="https://example.com/reference.jpg 或 data:image/...;base64,..."
                                    onChange={(e) => setReferenceImageUrl(e.target.value.trim())}
                                  />
                                </Form.Item>
                              </Space.Compact>
                            </Form.Item>
                          ) : null}
                          <Form.Item
                            label="Prompt"
                            name="prompt"
                            rules={[{ required: true, message: '请输入图片描述' }]}
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 4, maxRows: 8 }}
                              maxLength={1500}
                              showCount
                              placeholder="描述你想生成的画面、风格、构图和细节"
                            />
                          </Form.Item>
                          <Row gutter={12}>
                            <Col xs={24} md={12}>
                              <Form.Item label="比例" name="aspect_ratio">
                                <Select
                                  options={[
                                    '1:1',
                                    '16:9',
                                    '4:3',
                                    '3:2',
                                    '2:3',
                                    '3:4',
                                    '9:16',
                                    '21:9',
                                  ].map((value) => ({ value, label: value }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item label="数量" name="n">
                                <InputNumber min={1} max={9} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={12}>
                            <Col xs={24} md={12}>
                              <Form.Item label="返回格式" name="response_format">
                                <Select
                                  options={[
                                    { value: 'url', label: 'URL' },
                                    { value: 'base64', label: 'Base64' },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item label="Seed" name="seed">
                                <InputNumber style={{ width: '100%' }} placeholder="可选" />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Space size={24} style={{ marginBottom: 20 }}>
                            <Form.Item
                              name="prompt_optimizer"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="优化" unCheckedChildren="优化" />
                            </Form.Item>
                            <Form.Item
                              name="aigc_watermark"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="水印" unCheckedChildren="水印" />
                            </Form.Item>
                          </Space>
                          <Button
                            type="primary"
                            shape="round"
                            block
                            loading={imageGenerating}
                            onClick={handleGenerateImage}
                          >
                            生成图片
                          </Button>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={14} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          minHeight: 520,
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space direction="vertical" size={4}>
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              生成结果
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                              URL 结果由 MiniMax 托管，有效期通常为 24 小时。
                            </Text>
                          </Space>
                        }
                      >
                        {imageMode === 'i2i' && referenceImageUrl ? (
                          <div style={{ marginBottom: 20 }}>
                            <Text style={{ display: 'block', marginBottom: 8, color: '#6e6e73' }}>
                              参考图
                            </Text>
                            <Image
                              src={referenceImageUrl}
                              width={160}
                              height={120}
                              style={{ objectFit: 'cover', borderRadius: 12 }}
                              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDE2MCAxMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmNWY1ZjciLz48dGV4dCB4PSI4MCIgeT0iNjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5YjliYTEiIGZvbnQtc2l6ZT0iMTIiPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4="
                            />
                          </div>
                        ) : null}

                        {imageError ? (
                          <div
                            style={{
                              marginBottom: 20,
                              padding: 12,
                              borderRadius: 12,
                              color: '#a8071a',
                              background: '#fff1f0',
                              border: '1px solid #ffccc7',
                              wordBreak: 'break-word',
                            }}
                          >
                            {imageError}
                          </div>
                        ) : null}

                        {generatedImages.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <span style={{ color: '#6e6e73' }}>
                                填写 Prompt 后，生成结果会显示在这里。
                              </span>
                            }
                          />
                        ) : (
                          <Image.PreviewGroup>
                            <Row gutter={[16, 16]}>
                              {generatedImages.map((item, index) => (
                                <Col xs={24} md={12} key={`${item.type}-${index}`}>
                                  <div
                                    style={{
                                      overflow: 'hidden',
                                      borderRadius: 16,
                                      border: '1px solid #e5e5ea',
                                      background: '#f7f7f8',
                                    }}
                                  >
                                    <Image
                                      src={item.src}
                                      width="100%"
                                      height={280}
                                      style={{ objectFit: 'cover', display: 'block' }}
                                    />
                                  </div>
                                  <Space style={{ marginTop: 6 }}>
                                    {item.type === 'url' ? (
                                      <Button
                                        type="link"
                                        style={{ paddingLeft: 0 }}
                                        onClick={() => window.open(item.src, '_blank')}
                                      >
                                        打开原图
                                      </Button>
                                    ) : null}
                                    <Button
                                      type="link"
                                      style={{ paddingLeft: item.type === 'url' ? undefined : 0 }}
                                      onClick={() => downloadImage(item.src, index)}
                                    >
                                      下载
                                    </Button>
                                  </Space>
                                </Col>
                              ))}
                            </Row>
                          </Image.PreviewGroup>
                        )}

                        {imageResult?.metadata ? (
                          <Space size={16} style={{ marginTop: 18, color: '#6e6e73' }}>
                            <Text type="secondary">
                              成功 {imageResult.metadata.success_count ?? '-'}
                            </Text>
                            <Text type="secondary">
                              失败 {imageResult.metadata.failed_count ?? '-'}
                            </Text>
                            {imageResult.id ? (
                              <Text type="secondary">任务 {imageResult.id}</Text>
                            ) : null}
                          </Space>
                        ) : null}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'speech',
                label: '语音合成',
                children: (
                  <Row gutter={24} align="stretch">
                    <Col xs={24} lg={10} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space align="center">
                            <SoundOutlined style={{ fontSize: 18 }} />
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              MiniMax 语音合成
                            </Text>
                          </Space>
                        }
                      >
                        <Form
                          form={speechForm}
                          layout="vertical"
                          initialValues={{
                            model_id: minimaxModels[0]?.model_id,
                            speech_model: 'speech-2.8-hd',
                            speed: 1,
                            vol: 1,
                            pitch: 0,
                            sample_rate: 32000,
                            bitrate: 128000,
                            audio_format: 'mp3',
                            channel: 1,
                          }}
                        >
                          <Form.Item
                            label="MiniMax API 配置"
                            name="model_id"
                            rules={[{ required: true, message: '请选择 MiniMax API 配置' }]}
                          >
                            <Select
                              placeholder="选择一个带 MiniMax API Key 的模型配置"
                              options={minimaxModels.map((m) => ({
                                value: m.model_id,
                                label: `${m.name} (${m.type || '未设置类型'})`,
                              }))}
                              onChange={(value) => {
                                speechForm.setFieldValue('voice_id', undefined);
                                setVoices([]);
                                setSpeechResult(null);
                                fetchVoices(value);
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            label="文本"
                            name="text"
                            rules={[{ required: true, message: '请输入要合成的文本' }]}
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 4, maxRows: 8 }}
                              maxLength={5000}
                              showCount
                              placeholder="输入要合成的语音文本"
                            />
                          </Form.Item>
                          <Form.Item
                            label="音色"
                            name="voice_id"
                            rules={[{ required: true, message: '请选择音色' }]}
                          >
                            <Select
                              showSearch
                              placeholder="先加载音色列表"
                              loading={voiceLoading}
                              optionFilterProp="label"
                              options={voices.map((voice) => ({
                                value: voice.voice_id,
                                label: `${voice.voice_name || voice.voice_id} · ${
                                  voice.source === 'voice_cloning' ? '克隆音色' : '系统音色'
                                }`,
                              }))}
                              dropdownRender={(menu) => (
                                <>
                                  <div style={{ padding: '8px 8px 4px' }}>
                                    <Button
                                      block
                                      size="small"
                                      loading={voiceLoading}
                                      onClick={() => fetchVoices()}
                                    >
                                      刷新音色列表
                                    </Button>
                                  </div>
                                  {menu}
                                </>
                              )}
                            />
                          </Form.Item>
                          <Row gutter={12}>
                            <Col xs={24} md={12}>
                              <Form.Item label="模型" name="speech_model">
                                <Select
                                  options={[
                                    'speech-2.8-hd',
                                    'speech-2.8-turbo',
                                    'speech-2.6-hd',
                                    'speech-2.6-turbo',
                                    'speech-02-hd',
                                    'speech-02-turbo',
                                  ].map((value) => ({ value, label: value }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item label="情绪" name="emotion">
                                <Select
                                  allowClear
                                  placeholder="可选"
                                  options={['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'].map(
                                    (value) => ({ value, label: value }),
                                  )}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={12}>
                            <Col xs={24} md={8}>
                              <Form.Item label="语速" name="speed">
                                <InputNumber min={0.5} max={2} step={0.1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item label="音量" name="vol">
                                <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item label="音调" name="pitch">
                                <InputNumber min={-12} max={12} step={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={12}>
                            <Col xs={24} md={8}>
                              <Form.Item label="格式" name="audio_format">
                                <Select
                                  options={[
                                    { value: 'mp3', label: 'mp3' },
                                    { value: 'wav', label: 'wav' },
                                    { value: 'flac', label: 'flac' },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item label="采样率" name="sample_rate">
                                <Select
                                  options={[16000, 24000, 32000, 44100].map((value) => ({
                                    value,
                                    label: `${value}`,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item label="声道" name="channel">
                                <Select
                                  options={[
                                    { value: 1, label: '单声道' },
                                    { value: 2, label: '双声道' },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Button loading={voiceLoading} onClick={() => fetchVoices()}>
                              加载音色
                            </Button>
                            <Button
                              type="primary"
                              shape="round"
                              loading={speechLoading}
                              onClick={handleSynthesizeSpeech}
                            >
                              生成语音
                            </Button>
                          </Space>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={14} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          minHeight: 420,
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space direction="vertical" size={4}>
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              音频结果
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                              同步 HTTP 合成，结果可直接播放和下载。
                            </Text>
                          </Space>
                        }
                      >
                        {speechError ? (
                          <div
                            style={{
                              marginBottom: 20,
                              padding: 12,
                              borderRadius: 12,
                              color: '#a8071a',
                              background: '#fff1f0',
                              border: '1px solid #ffccc7',
                              wordBreak: 'break-word',
                            }}
                          >
                            {speechError}
                          </div>
                        ) : null}

                        {speechResult?.data?.audio_data_url ? (
                          <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            <audio
                              controls
                              src={speechResult.data.audio_data_url}
                              style={{ width: '100%' }}
                            />
                            <Space>
                              <Button type="primary" shape="round" onClick={downloadSpeechAudio}>
                                下载音频
                              </Button>
                              {speechResult.extra_info ? (
                                <Text type="secondary">
                                  {speechResult.extra_info.audio_format || 'audio'} ·{' '}
                                  {speechResult.extra_info.audio_length ?? '-'} ms ·{' '}
                                  {speechResult.extra_info.usage_characters ?? '-'} 字符
                                </Text>
                              ) : null}
                            </Space>
                            {speechResult.trace_id ? (
                              <Text type="secondary">Trace ID: {speechResult.trace_id}</Text>
                            ) : null}
                          </Space>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <span style={{ color: '#6e6e73' }}>
                                输入文本并选择音色后，生成的音频会显示在这里。
                              </span>
                            }
                          />
                        )}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'video',
                label: '视频生成',
                children: (
                  <Row gutter={24} align="stretch">
                    <Col xs={24} lg={10} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space align="center">
                            <VideoCameraOutlined style={{ fontSize: 18 }} />
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              MiniMax 视频生成
                            </Text>
                          </Space>
                        }
                      >
                        <Form
                          form={videoForm}
                          layout="vertical"
                          initialValues={{
                            model_id: minimaxModels[0]?.model_id,
                            video_model: 'MiniMax-Hailuo-2.3',
                            duration: 6,
                            resolution: '768P',
                            fast_pretreatment: false,
                            aigc_watermark: false,
                          }}
                        >
                          <Form.Item label="生成模式">
                            <Segmented
                              block
                              value={videoMode}
                              options={[
                                { label: '文生视频', value: 't2v' },
                                { label: '图生视频', value: 'i2v' },
                              ]}
                              onChange={(value) => {
                                const nextMode = value as 't2v' | 'i2v';
                                setVideoMode(nextMode);
                                setVideoError('');
                                setVideoTask(null);
                                setVideoFile(null);
                                if (nextMode === 't2v') {
                                  videoForm.setFieldValue('first_frame_image', undefined);
                                  setFirstFramePreview('');
                                }
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            label="MiniMax API 配置"
                            name="model_id"
                            rules={[{ required: true, message: '请选择 MiniMax API 配置' }]}
                          >
                            <Select
                              placeholder="选择一个带 MiniMax API Key 的模型配置"
                              options={minimaxModels.map((m) => ({
                                value: m.model_id,
                                label: `${m.name} (${m.type || '未设置类型'})`,
                              }))}
                            />
                          </Form.Item>
                          {videoMode === 'i2v' ? (
                            <Form.Item label="首帧图片" required>
                              <Space.Compact style={{ width: '100%' }}>
                                <Upload
                                  accept="image/jpeg,image/png,image/webp"
                                  showUploadList={false}
                                  beforeUpload={handleFirstFrameUpload}
                                >
                                  <Button icon={<UploadOutlined />}>上传</Button>
                                </Upload>
                                <Form.Item
                                  name="first_frame_image"
                                  noStyle
                                  rules={[{ required: true, message: '请上传或输入首帧图片' }]}
                                >
                                  <Input
                                    placeholder="https://example.com/first-frame.jpg 或 data:image/...;base64,..."
                                    onChange={(e) => setFirstFramePreview(e.target.value.trim())}
                                  />
                                </Form.Item>
                              </Space.Compact>
                            </Form.Item>
                          ) : null}
                          <Form.Item
                            label="Prompt"
                            name="prompt"
                            rules={[{ required: true, message: '请输入视频描述' }]}
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 4, maxRows: 8 }}
                              maxLength={2000}
                              showCount
                              placeholder="描述视频内容、动作、镜头运动，例如：女孩在雨夜街道奔跑，[推进]，霓虹灯反射在地面"
                            />
                          </Form.Item>
                          <Row gutter={12}>
                            <Col xs={24} md={12}>
                              <Form.Item label="模型" name="video_model">
                                <Select
                                  options={[
                                    'MiniMax-Hailuo-2.3',
                                    'MiniMax-Hailuo-2.3-Fast',
                                    'MiniMax-Hailuo-02',
                                  ].map((value) => ({ value, label: value }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={12} md={6}>
                              <Form.Item label="时长" name="duration">
                                <Select
                                  options={[
                                    { value: 6, label: '6 秒' },
                                    { value: 10, label: '10 秒' },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={12} md={6}>
                              <Form.Item label="分辨率" name="resolution">
                                <Select
                                  options={['512P', '720P', '768P', '1080P'].map((value) => ({
                                    value,
                                    label: value,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Space size={24} style={{ marginBottom: 20 }}>
                            <Form.Item
                              name="prompt_optimizer"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="优化" unCheckedChildren="优化" />
                            </Form.Item>
                            <Form.Item
                              name="fast_pretreatment"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="加速" unCheckedChildren="加速" />
                            </Form.Item>
                            <Form.Item
                              name="aigc_watermark"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="水印" unCheckedChildren="水印" />
                            </Form.Item>
                          </Space>
                          <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <Button
                              type="primary"
                              shape="round"
                              block
                              loading={videoLoading || videoPolling}
                              onClick={handleCreateVideo}
                            >
                              创建并轮询任务
                            </Button>
                            <Space.Compact style={{ width: '100%' }}>
                              <Form.Item name="task_id" noStyle>
                                <Input placeholder="已有 task_id，可手动查询" />
                              </Form.Item>
                              <Button loading={videoPolling} onClick={handleQueryVideoTask}>
                                查询
                              </Button>
                            </Space.Compact>
                          </Space>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={14} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          minHeight: 520,
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space direction="vertical" size={4}>
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              视频结果
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                              视频生成是异步任务，创建后会自动轮询状态。
                            </Text>
                          </Space>
                        }
                      >
                        {videoMode === 'i2v' && firstFramePreview ? (
                          <div style={{ marginBottom: 20 }}>
                            <Text style={{ display: 'block', marginBottom: 8, color: '#6e6e73' }}>
                              首帧预览
                            </Text>
                            <Image
                              src={firstFramePreview}
                              width={180}
                              height={120}
                              style={{ objectFit: 'cover', borderRadius: 12 }}
                              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDE4MCAxMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PHJlY3Qgd2lkdGg9IjE4MCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmNWY1ZjciLz48dGV4dCB4PSI5MCIgeT0iNjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5YjliYTEiIGZvbnQtc2l6ZT0iMTIiPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4="
                            />
                          </div>
                        ) : null}

                        {videoError ? (
                          <div
                            style={{
                              marginBottom: 20,
                              padding: 12,
                              borderRadius: 12,
                              color: '#a8071a',
                              background: '#fff1f0',
                              border: '1px solid #ffccc7',
                              wordBreak: 'break-word',
                            }}
                          >
                            {videoError}
                          </div>
                        ) : null}

                        {videoTask ? (
                          <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 20 }}>
                            {videoTask.task_id ? (
                              <Space wrap>
                                <Text>
                                  任务 ID：<Text code>{videoTask.task_id}</Text>
                                </Text>
                                <Button
                                  size="small"
                                  onClick={() => navigator.clipboard?.writeText(videoTask.task_id || '')}
                                >
                                  复制
                                </Button>
                              </Space>
                            ) : null}
                            <Text>
                              状态：<Tag color={videoTask.status === 'Success' ? 'green' : 'processing'}>
                                {videoTask.status || '已提交'}
                              </Tag>
                              {videoPolling ? <Text type="secondary"> 正在轮询...</Text> : null}
                            </Text>
                            {videoTask.file_id ? (
                              <Text>
                                文件 ID：<Text code>{videoTask.file_id}</Text>
                              </Text>
                            ) : null}
                            {videoTask.video_width && videoTask.video_height ? (
                              <Text type="secondary">
                                尺寸：{videoTask.video_width} × {videoTask.video_height}
                              </Text>
                            ) : null}
                          </Space>
                        ) : null}

                        {videoFile?.file?.download_url ? (
                          <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            <video
                              controls
                              src={videoFile.file.download_url}
                              style={{
                                width: '100%',
                                maxHeight: 520,
                                borderRadius: 16,
                                background: '#000',
                              }}
                            />
                            <Space>
                              <Button
                                type="primary"
                                shape="round"
                                onClick={() => window.open(videoFile.file?.download_url, '_blank')}
                              >
                                打开视频
                              </Button>
                              <Button onClick={downloadVideo}>下载视频</Button>
                              <Text type="secondary">
                                {videoFile.file.filename || 'output.mp4'} ·{' '}
                                {videoFile.file.bytes ? `${Math.round(videoFile.file.bytes / 1024 / 1024)} MB` : '-'}
                              </Text>
                            </Space>
                          </Space>
                        ) : !videoTask ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <span style={{ color: '#6e6e73' }}>
                                创建视频任务后，状态和生成结果会显示在这里。
                              </span>
                            }
                          />
                        ) : null}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'music',
                label: '音乐生成',
                children: (
                  <Row gutter={24} align="stretch">
                    <Col xs={24} lg={11} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space align="center">
                            <CustomerServiceOutlined style={{ fontSize: 18 }} />
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              歌词与歌曲
                            </Text>
                          </Space>
                        }
                      >
                        <Form
                          form={musicForm}
                          layout="vertical"
                          initialValues={{
                            model_id: minimaxModels[0]?.model_id,
                            music_model: 'music-2.6',
                            sample_rate: 44100,
                            bitrate: 256000,
                            audio_format: 'mp3',
                            lyrics_optimizer: false,
                            is_instrumental: false,
                            aigc_watermark: false,
                          }}
                        >
                          <Form.Item
                            label="MiniMax API 配置"
                            name="model_id"
                            rules={[{ required: true, message: '请选择 MiniMax API 配置' }]}
                          >
                            <Select
                              placeholder="选择一个带 MiniMax API Key 的模型配置"
                              options={minimaxModels.map((m) => ({
                                value: m.model_id,
                                label: `${m.name} (${m.type || '未设置类型'})`,
                              }))}
                            />
                          </Form.Item>

                          <Form.Item label="歌词模式">
                            <Segmented
                              block
                              value={lyricsMode}
                              options={[
                                { label: '生成完整歌曲', value: 'write_full_song' },
                                { label: '编辑/续写歌词', value: 'edit' },
                              ]}
                              onChange={(value) => setLyricsMode(value as 'write_full_song' | 'edit')}
                            />
                          </Form.Item>
                          <Form.Item label="歌曲标题" name="song_title">
                            <Input placeholder="可选，留空则由模型生成" />
                          </Form.Item>
                          <Form.Item
                            label="歌词提示"
                            name="lyrics_prompt"
                            rules={[{ required: true, message: '请输入歌词生成提示' }]}
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 3, maxRows: 6 }}
                              maxLength={2000}
                              showCount
                              placeholder="例如：一首关于夏日海边的轻快情歌，中文流行，女声"
                            />
                          </Form.Item>
                          <Form.Item label="风格标签" name="style_tags">
                            <Input placeholder="歌词生成后会自动填入，也可手动修改" />
                          </Form.Item>
                          <Form.Item
                            label="歌词"
                            name="lyrics"
                            rules={
                              lyricsMode === 'edit'
                                ? [{ required: true, message: '编辑模式下请输入现有歌词' }]
                                : []
                            }
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 8, maxRows: 16 }}
                              maxLength={3500}
                              showCount
                              placeholder="[Verse]\n...\n[Chorus]\n..."
                            />
                          </Form.Item>
                          <Button
                            block
                            loading={lyricsLoading}
                            onClick={handleGenerateLyrics}
                          >
                            生成/编辑歌词
                          </Button>

                          <div style={{ height: 24 }} />
                          <Form.Item
                            label="音乐模型"
                            name="music_model"
                            rules={[{ required: true, message: '请选择音乐模型' }]}
                          >
                            <Select
                              options={[
                                'music-2.6',
                                'music-2.6-free',
                                'music-cover',
                                'music-cover-free',
                              ].map((value) => ({ value, label: value }))}
                            />
                          </Form.Item>
                          <Form.Item
                            label="音乐描述"
                            name="music_prompt"
                            rules={[{ required: true, message: '请输入音乐描述' }]}
                          >
                            <Input.TextArea
                              autoSize={{ minRows: 2, maxRows: 5 }}
                              maxLength={2000}
                              showCount
                              placeholder="例如：独立民谣,忧郁,内省,咖啡馆"
                            />
                          </Form.Item>
                          <Row gutter={12}>
                            <Col xs={24} md={8}>
                              <Form.Item label="格式" name="audio_format">
                                <Select
                                  options={[
                                    { value: 'mp3', label: 'mp3' },
                                    { value: 'wav', label: 'wav' },
                                    { value: 'flac', label: 'flac' },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item label="采样率" name="sample_rate">
                                <Select
                                  options={[44100, 32000, 24000].map((value) => ({
                                    value,
                                    label: `${value}`,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item label="码率" name="bitrate">
                                <Select
                                  options={[128000, 192000, 256000, 320000].map((value) => ({
                                    value,
                                    label: `${value / 1000} kbps`,
                                  }))}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Space size={24} style={{ marginBottom: 20 }}>
                            <Form.Item
                              name="lyrics_optimizer"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="自动歌词" unCheckedChildren="自动歌词" />
                            </Form.Item>
                            <Form.Item
                              name="is_instrumental"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="纯音乐" unCheckedChildren="纯音乐" />
                            </Form.Item>
                            <Form.Item
                              name="aigc_watermark"
                              valuePropName="checked"
                              style={{ marginBottom: 0 }}
                            >
                              <Switch checkedChildren="水印" unCheckedChildren="水印" />
                            </Form.Item>
                          </Space>
                          <Button
                            type="primary"
                            shape="round"
                            block
                            loading={musicLoading}
                            onClick={handleGenerateMusic}
                          >
                            生成歌曲
                          </Button>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={13} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          minHeight: 520,
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space direction="vertical" size={4}>
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              音乐结果
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                              音乐生成返回 hex 音频，后端会转换成可播放音频。
                            </Text>
                          </Space>
                        }
                      >
                        {musicError ? (
                          <div
                            style={{
                              marginBottom: 20,
                              padding: 12,
                              borderRadius: 12,
                              color: '#a8071a',
                              background: '#fff1f0',
                              border: '1px solid #ffccc7',
                              wordBreak: 'break-word',
                            }}
                          >
                            {musicError}
                          </div>
                        ) : null}

                        {lyricsResult ? (
                          <div style={{ marginBottom: 24 }}>
                            <Title level={4} style={{ marginBottom: 8 }}>
                              {lyricsResult.song_title || '未命名歌曲'}
                            </Title>
                            {lyricsResult.style_tags ? (
                              <Paragraph style={{ color: '#6e6e73', marginBottom: 12 }}>
                                {lyricsResult.style_tags}
                              </Paragraph>
                            ) : null}
                            <pre
                              style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                padding: 16,
                                borderRadius: 16,
                                background: '#f7f7f8',
                                maxHeight: 360,
                                overflow: 'auto',
                              }}
                            >
                              {lyricsResult.lyrics}
                            </pre>
                          </div>
                        ) : null}

                        {musicResult?.data?.audio_data_url || musicResult?.data?.audio_url ? (
                          <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            <audio
                              controls
                              src={musicResult.data.audio_data_url || musicResult.data.audio_url}
                              style={{ width: '100%' }}
                            />
                            <Space>
                              <Button type="primary" shape="round" onClick={downloadMusicAudio}>
                                下载歌曲
                              </Button>
                              {musicResult.extra_info ? (
                                <Text type="secondary">
                                  {Math.round((musicResult.extra_info.music_duration || 0) / 1000)} 秒 ·{' '}
                                  {musicResult.extra_info.music_sample_rate || '-'} Hz ·{' '}
                                  {musicResult.extra_info.bitrate
                                    ? `${musicResult.extra_info.bitrate / 1000} kbps`
                                    : '-'}
                                </Text>
                              ) : null}
                            </Space>
                            {musicResult.trace_id ? (
                              <Text type="secondary">Trace ID: {musicResult.trace_id}</Text>
                            ) : null}
                          </Space>
                        ) : !lyricsResult ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <span style={{ color: '#6e6e73' }}>
                                先生成歌词，或直接填写歌词和音乐描述后生成歌曲。
                              </span>
                            }
                          />
                        ) : null}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'sites',
                label: '站点管理',
                children: (
                  <Row gutter={24} align="stretch">
                    <Col xs={24} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 24 }}
                        style={{
                          borderRadius: 28,
                          background:
                            'linear-gradient(135deg, rgba(250,250,252,0.9), rgba(245,245,247,0.9))',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                        }}
                        title={
                          <Space direction="vertical" size={4}>
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              站点列表
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                              管理你的个人站点关联信息。
                            </Text>
                          </Space>
                        }
                        extra={
                          <Space>
                            <Button type="link" onClick={fetchSites} style={{ paddingRight: 0 }}>
                              刷新
                            </Button>
                            <Button
                              type="primary"
                              shape="round"
                              icon={<PlusOutlined />}
                              onClick={openCreateSite}
                            >
                              新建站点
                            </Button>
                          </Space>
                        }
                      >
                        {sites.length === 0 ? (
                          <div style={{ padding: '40px 0' }}>
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={
                                <span style={{ color: '#6e6e73' }}>
                                  还没有站点。点击右上角「新建站点」开始添加。
                                </span>
                              }
                            />
                          </div>
                        ) : (
                          <Table
                            rowKey="site_id"
                            loading={siteLoading}
                            dataSource={sites}
                            pagination={false}
                            columns={[
                              {
                                title: '站点ID',
                                dataIndex: 'site_id',
                                key: 'site_id',
                                width: 100,
                              },
                              {
                                title: '站点名称',
                                dataIndex: 'site_name',
                                key: 'site_name',
                                render: (name: string) => name || '-',
                              },
                              {
                                title: '操作',
                                key: 'action',
                                width: 150,
                                render: (_: any, record: SiteItem) => (
                                  <Space size="small">
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<EditOutlined />}
                                      onClick={() => openEditSite(record)}
                                    >
                                      编辑
                                    </Button>
                                    <Button
                                      size="small"
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => handleDeleteSite(record)}
                                    >
                                      删除
                                    </Button>
                                  </Space>
                                ),
                              },
                            ]}
                          />
                        )}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'resume',
                label: '简历',
                children: (
                  <Row gutter={24} align="stretch">
                    <Col xs={24} style={{ marginBottom: 24 }}>
                      <Card
                        bordered={false}
                        bodyStyle={{ padding: 0 }}
                        style={{
                          borderRadius: 28,
                          background: '#fff',
                          boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
                          overflow: 'hidden',
                        }}
                        title={
                          <Space direction="vertical" size={4} style={{ padding: '24px 24px 0' }}>
                            <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                              个人简历
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                              查看我的完整简历。
                            </Text>
                          </Space>
                        }
                        extra={
                          <Space style={{ padding: '24px 24px 0' }}>
                            <Button
                              shape="round"
                              onClick={() => window.open('/resume.pdf', '_blank')}
                            >
                              新窗口打开
                            </Button>
                            <Button
                              type="primary"
                              shape="round"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = '/resume.pdf';
                                link.download = '马业辉.pdf';
                                link.click();
                              }}
                            >
                              下载简历
                            </Button>
                          </Space>
                        }
                      >
                        <div style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
                          <object
                            data="/resume.pdf"
                            type="application/pdf"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#6e6e73',
                              }}
                            >
                              <Text style={{ fontSize: 16, color: '#6e6e73', marginBottom: 16 }}>
                                无法直接预览简历
                              </Text>
                              <Space>
                                <Button
                                  type="primary"
                                  shape="round"
                                  onClick={() => window.open('/resume.pdf', '_blank')}
                                >
                                  在新窗口查看
                                </Button>
                                <Button
                                  shape="round"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = '/resume.pdf';
                                    link.download = 'Alex_yehui_简历.pdf';
                                    link.click();
                                  }}
                                >
                                  下载 PDF
                                </Button>
                              </Space>
                            </div>
                          </object>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </div>
      </Content>

      {/* 全局样式覆盖 */}
      <style>{`
        .ant-modal-content {
          overflow: hidden !important;
          border-radius: 0 !important;
        }
        .ant-modal-wrap {
          overflow: hidden !important;
        }
      `}</style>

      {/* 对话弹窗：点击某个模型的"对话"按钮后才出现 */}
      <Modal
        open={chatVisible}
        onCancel={closeChat}
        footer={null}
        width="100%"
        style={{ top: 0, padding: 0, maxWidth: '100%' }}
        bodyStyle={{ padding: 0, height: '100vh', overflow: 'hidden' }}
      >
        <div
          style={{
            minHeight: '100vh',
            background: '#f7f7f8',
            display: 'flex',
            justifyContent: 'center',
            padding: '24px 16px 40px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 920,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              height: 'calc(100vh - 80px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 8px 0',
              }}
            >
              <Space direction="vertical" size={2}>
                <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                  对话
                </Text>
                <Text style={{ fontSize: 12, color: '#6e6e73' }}>
                  当前模型：{activeModel?.name || '未选择'}
                </Text>
              </Space>
              <Space>
                <Button
                  onClick={() => {
                    setChatMessages([]);
                    chatForm.resetFields();
                    setLastUserMessage('');
                    stopStreaming();
                  }}
                >
                  清空
                </Button>
                <Button onClick={closeChat}>关闭</Button>
              </Space>
            </div>

            <div
              ref={chatListRef}
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '8px 8px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {chatMessages.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9b9ba1',
                  }}
                >
                  <Text style={{ color: '#9b9ba1' }}>
                    试着问一个问题，或者让模型帮你改写一段话。
                  </Text>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                          gap: 12,
                          maxWidth: '75%',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isUser ? '#111' : '#e6e6eb',
                            color: isUser ? '#fff' : '#111',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {isUser ? '你' : <RobotOutlined />}
                        </div>
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: 16,
                            background: isUser ? '#111' : '#fff',
                            color: isUser ? '#fff' : '#111',
                            boxShadow: isUser
                              ? '0 8px 18px rgba(0,0,0,0.18)'
                              : '0 10px 24px rgba(0,0,0,0.08)',
                            border: isUser ? '1px solid #111' : '1px solid #e5e5ea',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          {isUser ? (
                            msg.content
                          ) : msg.content ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeText = String(children).replace(/\n$/, '');
                                  const isBlock = Boolean(match) || String(children).includes('\n');
                                  if (!isBlock) {
                                    return (
                                      <code
                                        style={{
                                          background: '#f5f5f7',
                                          padding: '2px 6px',
                                          borderRadius: 6,
                                          fontSize: 12,
                                        }}
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    );
                                  }
                                  return (
                                    <SyntaxHighlighter
                                      style={oneLight}
                                      language={match?.[1] || 'text'}
                                      PreTag="div"
                                      customStyle={{
                                        margin: '12px 0',
                                        borderRadius: 12,
                                        padding: 12,
                                      }}
                                    >
                                      {codeText}
                                    </SyntaxHighlighter>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          ) : chatStreaming ? (
                            '正在思考…'
                          ) : (
                            ''
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                borderRadius: 20,
                background: '#fff',
                boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
                padding: '12px 12px 16px',
              }}
            >
              <Form form={chatForm} layout="vertical">
                <Form.Item
                  name="message"
                  rules={[{ required: true, message: '请输入提问内容' }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input.TextArea
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    placeholder="输入你的问题，Shift + Enter 换行"
                    disabled={chatStreaming}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleChat();
                      }
                    }}
                  />
                </Form.Item>
                <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                  <Text style={{ fontSize: 12, color: '#a1a1a6' }}>
                    发送后会立即开始流式生成
                  </Text>
                  <Button
                    onClick={handleRegenerate}
                    disabled={!lastUserMessage || chatStreaming}
                  >
                    重新生成
                  </Button>
                  <Button
                    onClick={stopStreaming}
                    disabled={!chatStreaming}
                  >
                    停止
                  </Button>
                  <Button
                    type="primary"
                    shape="round"
                    loading={chatLoading}
                    onClick={handleChat}
                    disabled={chatStreaming}
                  >
                    发送
                  </Button>
                </Space>
              </Form>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title={editingModel ? '编辑模型' : '新建模型'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        onOk={handleSaveModel}
        okText="保存"
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如：gpt-4o-2024" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {() => (
              <Form.Item
                label="Endpoint"
                name="endpoint"
                rules={[{ required: true, message: '请输入 Endpoint' }]}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="protocol" noStyle initialValue="https://">
                    <Select
                      style={{ width: 120 }}
                      options={[
                        { value: 'http://', label: 'http://' },
                        { value: 'https://', label: 'https://' },
                      ]}
                    />
                  </Form.Item>
                  <Input placeholder="api.openai.com/v1/chat/completions" />
                </Space.Compact>
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item
            label={editingModel ? 'API Key（留空则不修改）' : 'API Key'}
            name="api_key"
            rules={editingModel ? [] : [{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder={editingModel ? '输入新的 API Key 才会覆盖原密钥' : '用于访问下游大模型的密钥'} />
          </Form.Item>
          <Form.Item label="类型" name="type">
            <Input placeholder="例如：gpt-4o / glm-4 / qwen-max" />
          </Form.Item>
          <Form.Item label="维度" name="dimensions">
            <InputNumber style={{ width: '100%' }} placeholder="向量模型时可填，例如 1536" />
          </Form.Item>
          <Form.Item label="超时(秒)" name="timeout">
            <InputNumber style={{ width: '100%' }} placeholder="请求超时时间，默认可填 30" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSite ? '编辑站点' : '新建站点'}
        open={siteFormVisible}
        onCancel={() => setSiteFormVisible(false)}
        onOk={handleSaveSite}
        okText="保存"
        width={400}
      >
        <Form form={siteForm} layout="vertical">
          <Form.Item
            label="站点名称"
            name="site_name"
            rules={[{ required: true, message: '请输入站点名称' }]}
          >
            <Input placeholder="例如：我的博客" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default IndexPage;

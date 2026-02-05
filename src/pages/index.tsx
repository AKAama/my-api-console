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
} from 'antd';
import {
  PlusOutlined,
  ArrowRightOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
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
  api_key: string;
  timeout?: number;
  type?: string;
  dimensions?: number;
  enable?: number;
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

const IndexPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [activeModel, setActiveModel] = useState<ModelItem | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatAbortController, setChatAbortController] = useState<AbortController | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState('');
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
    fetchModels();
    fetchSites();
  }, []);

  useEffect(() => {
    if (!chatVisible) return;
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages, chatStreaming, chatVisible]);

  const stats = useMemo(() => {
    const total = models.length;
    const ready = models.filter(
      (m) => m.endpoint && m.api_key && (m.enable ?? 1) === 1,
    ).length;
    return { total, ready };
  }, [models]);

  const openCreate = () => {
    setEditingModel(null);
    form.resetFields();
    setFormVisible(true);
  };

  const openEdit = (m: ModelItem) => {
    setEditingModel(m);
    const protocol = m.endpoint?.match(/^https?:\/\//)?.[0] || 'https://';
    const displayEndpoint = m.endpoint?.replace(/^https?:\/\//, '') || '';
    form.setFieldsValue({
      name: m.name,
      protocol,
      endpoint: displayEndpoint,
      api_key: m.api_key,
      timeout: m.timeout,
      type: m.type,
      dimensions: m.dimensions,
    });
    setFormVisible(true);
  };

  const handleSaveModel = async () => {
    try {
      const values = await form.validateFields();
      // 组合 protocol 和 endpoint
      const { protocol, ...rest } = values;
      const finalValues = {
        ...rest,
        endpoint: `${protocol || 'https://'}${rest.endpoint || ''}`,
      };
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
    setLastUserPrompt('');
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

  const handleChat = async () => {
    if (!activeModel) {
      message.warning('请先选择一个模型');
      return;
    }
    if ((activeModel.enable ?? 1) === 0) {
      message.warning('当前模型已禁用，无法对话');
      return;
    }
    try {
      const values = await chatForm.validateFields();
      const prompt = (values.prompt || '').trim();
      if (!prompt) return;
      if (chatAbortController) {
        chatAbortController.abort();
      }
      const abortController = new AbortController();
      setChatAbortController(abortController);
      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: prompt,
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
      setLastUserPrompt(prompt);
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
              const parsed = JSON.parse(data);
              const delta =
                parsed?.choices?.[0]?.delta?.content ??
                parsed?.choices?.[0]?.message?.content ??
                parsed?.text ??
                parsed?.content ??
                '';
              if (delta) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, delta);
              }
            } catch {
              if (data) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, data);
              }
            }
          }
          lineBreakIndex = buffer.indexOf('\n');
        }
        if (doneFromServer) break;
      }
      if (!receivedTokens && rawText) {
        try {
          const parsed = JSON.parse(rawText);
          const content =
            parsed?.choices?.[0]?.message?.content ??
            parsed?.choices?.[0]?.text ??
            parsed?.content ??
            rawText;
          startTypewriter(assistantMessage.id, content);
        } catch {
          startTypewriter(assistantMessage.id, rawText);
        }
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
    if (!activeModel || !lastUserPrompt) {
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
              const parsed = JSON.parse(data);
              const delta =
                parsed?.choices?.[0]?.delta?.content ??
                parsed?.choices?.[0]?.message?.content ??
                parsed?.text ??
                parsed?.content ??
                '';
              if (delta) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, delta);
              }
            } catch {
              if (data) {
                receivedTokens = true;
                appendAssistantText(assistantMessage.id, data);
              }
            }
          }
          lineBreakIndex = buffer.indexOf('\n');
        }
        if (doneFromServer) break;
      }
      if (!receivedTokens && rawText) {
        try {
          const parsed = JSON.parse(rawText);
          const content =
            parsed?.choices?.[0]?.message?.content ??
            parsed?.choices?.[0]?.text ??
            parsed?.content ??
            rawText;
          startTypewriter(assistantMessage.id, content);
        } catch {
          startTypewriter(assistantMessage.id, rawText);
        }
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
        <Space size={24}>
          <Text style={{ color: '#6e6e73' }}>个人主页</Text>
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
                              const isEnabled = (m.enable ?? 1) === 1;
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
                                      opacity: isEnabled ? 1 : 0.6,
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
                                            {!isEnabled && (
                                              <Tag
                                                color="default"
                                                style={{
                                                  borderRadius: 999,
                                                  border: 'none',
                                                }}
                                              >
                                                已禁用
                                              </Tag>
                                            )}
                                          </div>
                                        </div>
                                      </Space>
                                      <Space size={8}>
                                        <Tooltip title={isEnabled ? '对话' : '模型已禁用'}>
                                          <Button
                                            size="small"
                                            type={isActive ? 'primary' : 'default'}
                                            shape="round"
                                            disabled={!isEnabled}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isEnabled) {
                                                openChatWithModel(m);
                                              }
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
                    setLastUserPrompt('');
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
                                code({ inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  if (inline) {
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
                                      {...props}
                                      style={oneLight}
                                      language={match?.[1] || 'text'}
                                      PreTag="div"
                                      customStyle={{
                                        margin: '12px 0',
                                        borderRadius: 12,
                                        padding: 12,
                                      }}
                                    >
                                      {String(children).replace(/\n$/, '')}
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
                  name="prompt"
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
                    disabled={!lastUserPrompt || chatStreaming}
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
            label="API Key"
            name="api_key"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="用于访问下游大模型的密钥" />
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

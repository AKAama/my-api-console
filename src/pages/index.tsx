import React, { useEffect, useMemo, useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  ArrowRightOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import axios from 'axios';

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
}

interface ModelListResponse {
  list: ModelItem[];
  total: number;
  page: number;
  page_size: number;
}

const IndexPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [activeModel, setActiveModel] = useState<ModelItem | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [form] = Form.useForm();
  const [chatForm] = Form.useForm();

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
  }, []);

  const stats = useMemo(() => {
    const total = models.length;
    const ready = models.filter((m) => m.endpoint && m.api_key).length;
    return { total, ready };
  }, [models]);

  const openCreate = () => {
    setEditingModel(null);
    form.resetFields();
    setFormVisible(true);
  };

  const openEdit = (m: ModelItem) => {
    setEditingModel(m);
    form.setFieldsValue({
      name: m.name,
      endpoint: m.endpoint,
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
      if (editingModel) {
        await axios.put(`/api/v1/models/${editingModel.model_id}`, values);
        message.success('已更新模型');
      } else {
        await axios.post('/api/v1/models/create', values);
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
            setChatAnswer('');
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
    setChatAnswer('');
    chatForm.resetFields();
  };

  const handleChat = async () => {
    if (!activeModel) {
      message.warning('请先选择一个模型');
      return;
    }
    try {
      const values = await chatForm.validateFields();
      setChatLoading(true);
      setChatStreaming(true);
      setChatAnswer('');

      const resp = await fetch(
        `/api/v1/models/chat/${activeModel.model_id}?stream=1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: values.prompt }),
        },
      );

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || '对话失败');
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        const text = await resp.text();
        setChatAnswer(text);
        setChatStreaming(false);
        return;
      }

      const decoder = new TextDecoder('utf-8');
      // 逐字流式展示
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setChatAnswer((prev) => prev + chunk);
      }
      setChatStreaming(false);
    } catch (e: any) {
      message.error(e?.message || '对话失败');
      setChatStreaming(false);
    } finally {
      setChatLoading(false);
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
          <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={openCreate}>
            新建模型
          </Button>
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
            <Button shape="round" onClick={openCreate}>
              添加一个模型小工具
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
                label: '模型管理（实验模块）',
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
                          <Button type="link" onClick={fetchModels} style={{ paddingRight: 0 }}>
                            刷新
                          </Button>
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
                                      background: isActive ? '#111' : 'rgba(255,255,255,0.9)',
                                      color: isActive ? '#f5f5f7' : '#111',
                                      boxShadow: isActive
                                        ? '0 18px 40px rgba(0,0,0,0.35)'
                                        : '0 10px 30px rgba(0,0,0,0.06)',
                                      transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                                      transition: 'all 0.25s ease',
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
                                              ? 'linear-gradient(135deg, #0ff, #0af)'
                                              : '#f5f5f7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <RobotOutlined
                                            style={{
                                              fontSize: 16,
                                              color: isActive ? '#000' : '#111',
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <Text
                                            style={{
                                              fontWeight: 600,
                                              fontSize: 16,
                                              color: isActive ? '#f5f5f7' : '#111',
                                            }}
                                          >
                                            {m.name}
                                          </Text>
                                          <div style={{ marginTop: 6 }}>
                                            {m.type ? (
                                              <Tag
                                                color={isActive ? 'default' : 'blue'}
                                                style={{
                                                  borderRadius: 999,
                                                  border: 'none',
                                                  background: isActive ? '#2c2c2e' : undefined,
                                                  color: isActive ? '#f5f5f7' : undefined,
                                                }}
                                              >
                                                {m.type}
                                              </Tag>
                                            ) : (
                                              <Tag
                                                style={{
                                                  borderRadius: 999,
                                                  border: 'none',
                                                  background: isActive ? '#2c2c2e' : '#f5f5f7',
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
                                        color: isActive ? '#d2d2d7' : '#6e6e73',
                                      }}
                                      ellipsis={{ rows: 2 }}
                                    >
                                      {m.endpoint}
                                    </Paragraph>
                                    <Space size={16} style={{ fontSize: 11 }}>
                                      <span style={{ color: isActive ? '#a1a1a6' : '#6e6e73' }}>
                                        维度 {m.dimensions ?? '-'}
                                      </span>
                                      <span style={{ color: isActive ? '#a1a1a6' : '#6e6e73' }}>
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
            ]}
          />
        </div>
      </Content>

      {/* 对话弹窗：点击某个模型的“对话”按钮后才出现 */}
      <Modal
        open={chatVisible}
        onCancel={() => setChatVisible(false)}
        footer={null}
        width="100%"
        style={{ top: 0, padding: 0, maxWidth: '100%' }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            minHeight: '100vh',
            background:
              'radial-gradient(circle at top left, #f5f5f7 0, #ffffff 45%, #f5f5f7 100%)',
            display: 'flex',
            justifyContent: 'center',
            padding: '40px 16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 840,
              background: 'rgba(255,255,255,0.96)',
              borderRadius: 28,
              boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '80vh',
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={4}>
                <Text style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
                  LLM 对话
                </Text>
                <Text style={{ fontSize: 13, color: '#6e6e73' }}>
                  与当前选中的模型发起一次对话请求，响应以流式方式逐字展示。
                </Text>
              </Space>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  background: '#f5f5f7',
                  border: '1px solid #e5e5ea',
                  padding: 16,
                  marginBottom: 16,
                  fontFamily:
                    'SF Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
                  fontSize: 11,
                  overflow: 'auto',
                }}
              >
                {chatAnswer ? (
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: '#1d1d1f',
                    }}
                  >
                    {chatAnswer}
                  </pre>
                ) : (
                  <Text style={{ color: '#6e6e73' }}>
                    模型响应会以原始 JSON 的形式展示在这里，便于调试和保存。
                  </Text>
                )}
                {chatStreaming && (
                  <div style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: '#a1a1a6' }}>
                      正在流式生成响应…
                    </Text>
                  </div>
                )}
              </div>

              <Form form={chatForm} layout="vertical">
                <Form.Item
                  label={<Text style={{ color: '#111', fontSize: 13 }}>提问内容</Text>}
                  name="prompt"
                  rules={[{ required: true, message: '请输入提问内容' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="描述你想要模型做什么，例如：给我一个关于 Go 泛型的入门示例。"
                  />
                </Form.Item>
                <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                  <Button
                    onClick={() => {
                      chatForm.resetFields();
                      setChatAnswer('');
                    }}
                  >
                    清空
                  </Button>
                  <Button type="primary" loading={chatLoading} onClick={handleChat}>
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
          <Form.Item
            label="Endpoint"
            name="endpoint"
            rules={[{ required: true, message: '请输入 Endpoint' }]}
          >
            <Input placeholder="例如：https://api.openai.com/v1/chat/completions" />
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
    </Layout>
  );
};

export default IndexPage;


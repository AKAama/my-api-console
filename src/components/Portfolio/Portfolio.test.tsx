import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Portfolio from './Portfolio';

describe('Portfolio', () => {
  it('renders the English portfolio and its public destinations', () => {
    render(<Portfolio />);

    expect(screen.getByRole('heading', { name: 'Ma Yehui' })).toBeInTheDocument();
    expect(screen.getByText(/Independent Developer/)).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.queryByRole('heading', { name: 'Education' })).not.toBeInTheDocument();
    expect(screen.queryByText('01')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.getAllByRole('img').map((image) => image.getAttribute('src'))).toEqual([
      '/projects/calendar.jpg',
      '/projects/evenly.jpg',
      '/projects/calm.jpg',
      '/projects/lyrics.jpg',
    ]);
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/AKAama',
    );
    expect(screen.getByRole('link', { name: 'GitHub' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Weibo' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Instagram' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'LinkedIn' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Email' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Read the blog/ })).toHaveAttribute(
      'href',
      'https://hexo.ismyh.cn/',
    );
    expect(screen.queryByText('模型管理')).not.toBeInTheDocument();
    expect(screen.queryByText('图片生成')).not.toBeInTheDocument();
  });

  it('switches the complete page to Chinese', async () => {
    render(<Portfolio />);

    await userEvent.click(screen.getByRole('button', { name: '切换到中文' }));

    expect(screen.getByRole('navigation', { name: '主要导航' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '关于我' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '项目' })).toBeInTheDocument();
    expect(screen.getByText(/AI 是我的协作工具/)).toBeInTheDocument();
  });

  it('does not contact the retired API while rendering or changing language', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<Portfolio />);

    await userEvent.click(screen.getByRole('button', { name: '切换到中文' }));

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

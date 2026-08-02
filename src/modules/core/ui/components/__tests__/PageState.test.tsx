import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageState } from '../PageState';

describe('PageState', () => {
  it('renders states in loading, error, empty, content priority order', () => {
    const { rerender } = render(
      <PageState isLoading isError isEmpty loadingMsg="Loading roster">
        Content
      </PageState>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading roster');

    rerender(
      <PageState isError isEmpty errorTitle="Could not load" errorMsg="Try again">
        Content
      </PageState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');

    rerender(
      <PageState isEmpty emptyTitle="Nothing here" emptyDesc="Change the filters">
        Content
      </PageState>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Nothing here');

    rerender(<PageState>Content</PageState>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('offers retry only when a retry handler is provided', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<PageState isError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<PageState isError />);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

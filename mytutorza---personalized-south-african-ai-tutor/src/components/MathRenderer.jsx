import katex from 'katex';

const MathRenderer = ({ children }) => {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(children, {
          throwOnError: false,
          displayMode: children.includes('\n'),
        }),
      }}
    />
  );
};


import ReactMarkdown from 'react-markdown';
import katex from 'katex';

const Notes = ({ content }) => (
  <ReactMarkdown
    components={{
      inlineMath: [
        ({ children }) => <span dangerouslySetInnerHTML={{ __html: katex.renderToString(children, { throwOnError: false }) }} />,
      ],
      math: ({ children, inline }) => <span dangerouslySetInnerHTML={{ __html: katex.renderToString(children, { throwOnError: false, displayMode: !inline }) }} />,
    }}
  >
    {content}
  </ReactMarkdown>
);
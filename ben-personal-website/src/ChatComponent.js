import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import axios from 'axios';

const ChatContainer = styled.div`
  max-width: 100%;
  margin: 0 auto;
`;

const MessageContainer = styled.div`
  height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: #141414;
  border: 1px solid #1f1f1f;
  border-radius: 14px 14px 0 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #27272a;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #3f3f46;
  }
`;

const Message = styled.div`
  margin: 8px 0;
  padding: 10px 16px;
  border-radius: 12px;
  max-width: 85%;
  line-height: 1.5;
  font-size: 14px;
  word-wrap: break-word;
  ${props => props.isUser ? `
    background: linear-gradient(135deg, #818cf8, #a78bfa);
    margin-left: auto;
    color: #0a0a0a;
    font-weight: 500;
  ` : `
    background: #1f1f1f;
    margin-right: auto;
    color: #d4d4d8;
  `}
`;

const InputForm = styled.form`
  display: flex;
  gap: 0;
`;

const Input = styled.input`
  flex: 1;
  padding: 14px 18px;
  border: 1px solid #1f1f1f;
  border-top: none;
  border-radius: 0 0 0 14px;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  background: #141414;
  color: #e4e4e7;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #818cf8;
  }

  &::placeholder {
    color: #52525b;
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const SendButton = styled.button`
  padding: 14px 20px;
  border: 1px solid #1f1f1f;
  border-top: none;
  border-left: none;
  border-radius: 0 0 14px 0;
  background: #141414;
  color: #818cf8;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(129, 140, 248, 0.1);
    color: #a78bfa;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const TypingDots = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px;

  span {
    width: 6px;
    height: 6px;
    background: #52525b;
    border-radius: 50%;
    animation: typing-bounce 1.4s ease-in-out infinite;
  }

  span:nth-of-type(2) { animation-delay: 0.2s; }
  span:nth-of-type(3) { animation-delay: 0.4s; }

  @keyframes typing-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-6px); opacity: 1; }
  }
`;

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('https://ben-guo-website.onrender.com/api/chat', {
        messages: [...messages, newMessage]
      });
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContainer>
      <MessageContainer>
        {messages.length === 0 && (
          <Message>Hi there! Ask me anything about Ben.</Message>
        )}
        {messages.map((msg, idx) => (
          <Message key={idx} isUser={msg.role === 'user'}>
            {msg.content}
          </Message>
        ))}
        {isLoading && (
          <TypingDots>
            <span /><span /><span />
          </TypingDots>
        )}
        <div ref={messagesEndRef} />
      </MessageContainer>
      <InputForm onSubmit={handleSend}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <SendButton type="submit" disabled={isLoading || !input.trim()}>
          Send
        </SendButton>
      </InputForm>
    </ChatContainer>
  );
};

export default ChatComponent;

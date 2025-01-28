import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import axios from 'axios';

const ChatContainer = styled.div`
  max-width: 800px; // Increased from 600px
  width: 90%; // Added to make it responsive
  margin: 20px auto;
  padding: 20px;
  background: rgba(255, 192, 203, 0.1);
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(255, 182, 193, 0.1);
`;

const MessageContainer = styled.div`
  height: 500px; // Increased from 400px
  overflow-y: auto;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  margin-bottom: 20px;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #FFF0F5;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #FFB6C1;
    border-radius: 4px;
  }
`;

const Message = styled.div`
  margin: 10px 0;
  padding: 12px 18px;
  border-radius: 15px;
  max-width: 85%; // Increased from 80%
  line-height: 1.4;
  word-wrap: break-word;
  ${props => props.isUser ? `
    background: #FFB6C1;
    margin-left: auto;
    color: white;
  ` : `
    background: #FFF0F5;
    margin-right: auto;
    color: #FF69B4;
  `}
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #FFB6C1;
  border-radius: 25px;
  font-size: 16px;
  &:focus {
    outline: none;
    border-color: #FF69B4;
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
      const response = await axios.post('http://localhost:3001/api/chat', {
        messages: [...messages, newMessage]
      });
      
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContainer>
      <MessageContainer>
        {messages.map((msg, idx) => (
          <Message key={idx} isUser={msg.role === 'user'}>
            {msg.content}
          </Message>
        ))}
        {isLoading && <Message>Typing...</Message>}
        <div ref={messagesEndRef} />
      </MessageContainer>
      <form onSubmit={handleSend}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything! 💕"
          disabled={isLoading}
        />
      </form>
    </ChatContainer>
  );
};

export default ChatComponent;

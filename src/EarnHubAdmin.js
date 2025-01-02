// src/pages/EarnHubAdmin.js
import React, { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
  background: #1a1a1a;
  color: white;
  min-height: 80vh;
  font-family: 'Playfair Display', serif;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  max-width: 500px;
  margin: 0 auto;
  background: #333;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
`;

const Label = styled.label`
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #444;
  background: #222;
  color: white;
`;

const Button = styled.button`
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    background: #45a049;
  }
`;

const EarnHubAdmin = () => {
  const [task, setTask] = useState({
    name: '',
    description: '',
    points: '',
    link: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTask({
      ...task,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://task.pooldegens.com/api/add_earn_hub_task', task);
      alert('Task added successfully');
      setTask({
        name: '',
        description: '',
        points: '',
        link: ''
      });
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task');
    }
  };

  return (
    <Container>
      <h1>Admin - Add New Task</h1>
      <Form onSubmit={handleSubmit}>
        <Label>Task Name</Label>
        <Input
          type="text"
          name="name"
          value={task.name}
          onChange={handleChange}
          required
        />
        <Label>Task Description</Label>
        <Input
          type="text"
          name="description"
          value={task.description}
          onChange={handleChange}
          required
        />
        <Label>Points</Label>
        <Input
          type="number"
          name="points"
          value={task.points}
          onChange={handleChange}
          required
        />
        <Label>Link</Label>
        <Input
          type="text"
          name="link"
          value={task.link}
          onChange={handleChange}
        />
        <Button type="submit">Add Task</Button>
      </Form>
    </Container>
  );
};

export default EarnHubAdmin;

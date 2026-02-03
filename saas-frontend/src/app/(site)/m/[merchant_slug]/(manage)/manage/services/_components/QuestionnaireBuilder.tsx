'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export interface ServiceQuestion {
  id: string;
  question: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface QuestionnaireBuilderProps {
  questions: ServiceQuestion[];
  onChange: (questions: ServiceQuestion[]) => void;
}

export function QuestionnaireBuilder({ questions, onChange }: QuestionnaireBuilderProps) {
  const [editingOptions, setEditingOptions] = useState<{ [key: string]: string }>({});

  const addQuestion = () => {
    const newQuestion: ServiceQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      type: 'TEXT',
      required: true,
      placeholder: ''
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<ServiceQuestion>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    const optionValue = editingOptions[questionId]?.trim();
    if (!optionValue) return;

    updateQuestion(questionId, {
      options: [...(questions.find(q => q.id === questionId)?.options || []), optionValue]
    });
    setEditingOptions({ ...editingOptions, [questionId]: '' });
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    updateQuestion(questionId, {
      options: question.options?.filter((_, i) => i !== optionIndex)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Client Intake Questionnaire</h3>
          <p className="text-sm text-muted-foreground">
            Add questions to gather information from your clients
          </p>
        </div>
        <Button type="button" onClick={addQuestion} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No questions yet. Click &quot;Add Question&quot; to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 space-y-4">
                    <CardTitle className="text-sm">Question {index + 1}</CardTitle>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Question</Label>
                        <Input
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                          placeholder="Enter your question..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Type</Label>
                          <Select
                            value={question.type}
                            onValueChange={(value: ServiceQuestion['type']) =>
                              updateQuestion(question.id, { type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TEXT">Short Text</SelectItem>
                              <SelectItem value="TEXTAREA">Long Text</SelectItem>
                              <SelectItem value="SELECT">Dropdown</SelectItem>
                              <SelectItem value="MULTISELECT">Multi-Select</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label>Placeholder (optional)</Label>
                          <Input
                            value={question.placeholder || ''}
                            onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                            placeholder="e.g., Enter your name..."
                          />
                        </div>
                      </div>

                      {(question.type === 'SELECT' || question.type === 'MULTISELECT') && (
                        <div className="grid gap-2">
                          <Label>Options</Label>
                          <div className="space-y-2">
                            {question.options?.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <Input value={option} readOnly className="flex-1" />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(question.id, optIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingOptions[question.id] || ''}
                                onChange={(e) =>
                                  setEditingOptions({ ...editingOptions, [question.id]: e.target.value })
                                }
                                placeholder="Add option..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addOption(question.id);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => addOption(question.id)}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${question.id}`}
                            checked={question.required}
                            onCheckedChange={(checked) =>
                              updateQuestion(question.id, { required: checked as boolean })
                            }
                          />
                          <Label htmlFor={`required-${question.id}`} className="text-sm font-normal">
                            Required question
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

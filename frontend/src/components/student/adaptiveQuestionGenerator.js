const QUESTION_DISTRIBUTION = {
  mcq: 4,
  fill_blank: 2,
  match: 2,
  drag_drop: 2,
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'about', 'your', 'their', 'there',
  'these', 'those', 'because', 'while', 'where', 'when', 'which', 'what', 'have', 'has', 'had',
  'been', 'being', 'were', 'was', 'are', 'is', 'can', 'will', 'should', 'could', 'would', 'than',
  'then', 'them', 'they', 'also', 'such', 'some', 'more', 'most', 'only', 'very', 'each', 'used',
  'using', 'use', 'make', 'makes', 'made', 'after', 'before', 'under', 'over', 'between', 'during',
  'through', 'across', 'like', 'just', 'much', 'many', 'onto', 'upon', 'within', 'without', 'lesson',
  'topic', 'notes', 'student', 'learn', 'learning', 'course',
]);

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const normalizeWhitespace = (value = '') =>
  String(value || '')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sentenceCase = (value = '') => {
  const text = normalizeWhitespace(value);
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const splitIntoSentences = (text = '') =>
  normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^[*-]\s*/, '').trim())
    .filter((sentence) => sentence.length > 20);

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toTitle = (value = '') =>
  normalizeWhitespace(value)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const createId = (prefix, index) => `${prefix}-${index}`;

const extractKeywords = (text = '', limit = 20) => {
  const counts = new Map();

  normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

const extractConceptPairs = (sentences = [], topicTitle = '') => {
  const patterns = [
    /^(?<left>[A-Z][A-Za-z0-9\s/-]{1,40}?)\s+(?:is|are|means|refers to|describes|allows|helps|enables)\s+(?<right>.+)$/i,
    /^(?<left>[A-Za-z0-9\s/-]{2,40}?)\s*:\s*(?<right>.+)$/i,
  ];

  const pairs = sentences.map((sentence, index) => {
    const clean = sentence.replace(/[.]+$/, '').trim();

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (!match?.groups?.left || !match?.groups?.right) continue;

      const left = sentenceCase(match.groups.left.replace(/\b(it|they|this|that)\b/i, '').trim());
      const right = sentenceCase(match.groups.right.trim());
      if (left.length < 3 || right.length < 10) continue;

      return { left, right, sentence: clean, index };
    }

    const words = clean.split(' ').filter(Boolean);
    const subject = words.slice(0, Math.min(3, words.length)).join(' ');
    return {
      left: sentenceCase(subject || topicTitle || `Concept ${index + 1}`),
      right: sentenceCase(clean),
      sentence: clean,
      index,
    };
  });

  return uniqueBy(
    pairs.filter((pair) => pair.left && pair.right),
    (pair) => `${pair.left.toLowerCase()}|${pair.right.toLowerCase()}`
  );
};

const extractOrderedSteps = (sentences = [], topicTitle = '') => {
  const orderedMarkers = /^(first|second|third|next|then|finally|lastly|step\s+\d+)/i;
  const explicit = sentences
    .filter((sentence) => orderedMarkers.test(sentence))
    .map((sentence) => sentence.replace(/[.]+$/, '').trim());

  if (explicit.length >= 3) {
    return explicit.slice(0, 4);
  }

  return sentences
    .slice(0, 4)
    .map((sentence, index) => sentenceCase(sentence.replace(/[.]+$/, '').trim()) || `${topicTitle} step ${index + 1}`)
    .filter(Boolean);
};

const buildDistractors = (correctValue, conceptPairs, keywords, count = 3) => {
  const distractors = [];

  conceptPairs.forEach((pair) => {
    if (distractors.length >= count) return;
    if (pair.right !== correctValue) {
      distractors.push(pair.right);
    }
  });

  keywords.forEach((keyword) => {
    if (distractors.length >= count) return;
    const option = `${toTitle(keyword)} is the main answer.`;
    if (option !== correctValue) {
      distractors.push(option);
    }
  });

  while (distractors.length < count) {
    distractors.push(`This statement does not fully describe ${correctValue.split(' ')[0] || 'the concept'}.`);
  }

  return uniqueBy(distractors, (item) => item.toLowerCase()).slice(0, count);
};

const buildMcqQuestions = ({ topicTitle, conceptPairs, keywords }) =>
  Array.from({ length: QUESTION_DISTRIBUTION.mcq }, (_, index) => {
    const pair = conceptPairs[index % conceptPairs.length];
    const difficulty = index < 2 ? 'easy' : index === 2 ? 'medium' : 'hard';
    const correct = pair?.right || sentenceCase(`This detail is taken from ${topicTitle} notes.`);
    const options = uniqueBy(
      [correct, ...buildDistractors(correct, conceptPairs.slice(index + 1).concat(conceptPairs.slice(0, index)), keywords)],
      (item) => item.toLowerCase()
    ).slice(0, 4);

    return {
      _id: createId('ai-mcq', index),
      prompt: `Which statement best matches ${pair?.left || topicTitle}?`,
      type: 'mcq',
      difficulty,
      options: options.sort(() => Math.random() - 0.5),
      answer: correct,
      points: 10,
      metadata: {
        source: 'ai_notes',
        concept: pair?.left || topicTitle,
      },
    };
  });

const buildFillBlankQuestions = ({ topicTitle, conceptPairs }) =>
  Array.from({ length: QUESTION_DISTRIBUTION.fill_blank }, (_, index) => {
    const pair = conceptPairs[(index + 1) % conceptPairs.length];
    const sentence = pair?.sentence || `${pair?.left || topicTitle} is important in this topic.`;
    const answerLabel = pair?.left || topicTitle;
    const prompt = `Fill in the missing term from the ${topicTitle} notes.`;

    return {
      _id: createId('ai-fill', index),
      prompt,
      type: 'fill_blank',
      difficulty: index === 0 ? 'easy' : 'medium',
      answer: answerLabel,
      points: 10,
      metadata: {
        source: 'ai_notes',
        fillText: sentence.replace(new RegExp(answerLabel, 'i'), answerLabel),
        blanks: [
          {
            id: createId('ai-fill-blank', index),
            label: answerLabel,
            answersText: answerLabel,
          },
        ],
        wordBankEnabled: true,
        wordBankWords: uniqueBy(
          conceptPairs.slice(0, 4).map((item) => item.left),
          (item) => item.toLowerCase()
        ).join(', '),
      },
    };
  });

const buildMatchQuestions = ({ topicTitle, conceptPairs }) =>
  Array.from({ length: QUESTION_DISTRIBUTION.match }, (_, index) => {
    const subset = conceptPairs.slice(index * 3, index * 3 + 3);
    const paddedSubset = subset.length >= 3 ? subset : conceptPairs.slice(0, 3);
    const leftItems = paddedSubset.map((pair, itemIndex) => ({
      id: createId(`ai-match-left-${index}`, itemIndex),
      text: pair.left,
    }));
    const rightItems = paddedSubset.map((pair, itemIndex) => ({
      id: createId(`ai-match-right-${index}`, itemIndex),
      text: pair.right,
    }));

    return {
      _id: createId('ai-match', index),
      prompt: `Match each ${topicTitle} concept with the correct explanation.`,
      type: 'match',
      difficulty: index === 0 ? 'medium' : 'hard',
      points: 10,
      metadata: {
        source: 'ai_notes',
        matchLeft: leftItems,
        matchRight: rightItems.sort(() => Math.random() - 0.5),
        pairs: leftItems.map((leftItem, itemIndex) => ({
          leftId: leftItem.id,
          rightId: rightItems[itemIndex].id,
        })),
      },
    };
  });

const buildDragQuestions = ({ topicTitle, orderedSteps, keywords }) =>
  Array.from({ length: QUESTION_DISTRIBUTION.drag_drop }, (_, index) => {
    const baseItems = index === 0
      ? orderedSteps.slice(0, 4)
      : uniqueBy(
          keywords.slice(0, 4).map((keyword) => `Review ${toTitle(keyword)}`),
          (item) => item.toLowerCase()
        );
    const items = (baseItems.length >= 3 ? baseItems : orderedSteps.slice(0, 3)).slice(0, 4);

    return {
      _id: createId('ai-drag', index),
      prompt: index === 0
        ? `Arrange these ${topicTitle} steps in the correct study order from the notes.`
        : `Arrange these ${topicTitle} review items in the intended order.`,
      type: 'drag_drop',
      difficulty: index === 0 ? 'medium' : 'hard',
      answer: items.join(' | '),
      points: 10,
      metadata: {
        source: 'ai_notes',
        dragItems: shuffle(items).map((item, itemIndex) => ({
          id: createId(`ai-drag-item-${index}`, itemIndex),
          text: item,
        })),
      },
    };
  });

const shuffle = (items = []) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

export const generateAdaptiveQuizFromNotes = ({ topicTitle = 'Topic', notesContent = '', fallbackText = '' }) => {
  const sourceText = normalizeWhitespace(notesContent || fallbackText || '');
  if (!sourceText) {
    return {
      title: `${topicTitle} Adaptive Quiz`,
      questions: [],
      source: 'ai_notes',
    };
  }

  const sentences = splitIntoSentences(sourceText);
  const safeSentences = sentences.length ? sentences : [sentenceCase(sourceText)];
  const conceptPairs = extractConceptPairs(safeSentences, topicTitle);
  const safePairs = conceptPairs.length
    ? conceptPairs
    : safeSentences.slice(0, 6).map((sentence, index) => ({
        left: `${topicTitle} concept ${index + 1}`,
        right: sentenceCase(sentence),
        sentence: sentenceCase(sentence),
        index,
      }));
  const keywords = extractKeywords(sourceText, 16);
  const orderedSteps = extractOrderedSteps(safeSentences, topicTitle);

  const questions = [
    ...buildMcqQuestions({ topicTitle, conceptPairs: safePairs, keywords }),
    ...buildFillBlankQuestions({ topicTitle, conceptPairs: safePairs }),
    ...buildMatchQuestions({ topicTitle, conceptPairs: safePairs }),
    ...buildDragQuestions({ topicTitle, orderedSteps, keywords }),
  ].map((question, index) => ({
    ...question,
    difficulty: DIFFICULTIES.includes(question.difficulty) ? question.difficulty : 'easy',
    prompt: sentenceCase(question.prompt || `${topicTitle} adaptive question ${index + 1}`),
  }));

  return {
    title: `${topicTitle} Adaptive Quiz`,
    source: 'ai_notes',
    generatedFrom: sourceText.slice(0, 240),
    questions,
  };
};

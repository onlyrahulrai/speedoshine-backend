### Start Server with PM2
Use the following command to run the server with **PM2**, giving it a custom name (`digitaldetoxification`) and using `tsx` as the TypeScript interpreter: 

```bash
pm2 start src/server.ts --name digitaldetoxification --interpreter tsx
```

#### Quiz Attempt Aggregation Pipeline
This MongoDB aggregation groups quiz attempts by quiz, counts unique participants, calculates status breakdown (in_progress vs completed), and computes the average score. It also enriches the result with quiz details (title, description):

```
[
  {
    $group: {
      _id: "$quiz",
      totalParticipants: { $addToSet: "$user" },
      statusBreakdown: { $push: "$status" },
      avgScore: { $avg: "$score" }
    }
  },
  {
    $project: {
      quiz: "$_id",
      totalParticipants: { $size: "$totalParticipants" },
      inProgress: {
        $size: {
          $filter: {
            input: "$statusBreakdown",
            as: "s",
            cond: { $eq: ["$$s", "in_progress"] }
          }
        }
      },
      completed: {
        $size: {
          $filter: {
            input: "$statusBreakdown",
            as: "s",
            cond: { $eq: ["$$s", "completed"] }
          }
        }
      },
      avgScore: 1
    }
  },
  {
    $lookup: {
      from: "quizzes",
      let: { quizId: "$quiz" },
      pipeline: [
        { $match: { $expr: { $eq: ["$_id", "$$quizId"] } } },
        { $project: { title: 1, description: 1 } }
      ],
      as: "quiz"
    }
  },
  { $unwind: "$quiz" }
]
```

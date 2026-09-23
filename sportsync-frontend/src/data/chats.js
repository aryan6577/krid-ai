// Synthetic/demo chat history so the messaging popup has content out of the box (prototype demo data).

export const friendChatSeeds = {
  p1: [
    { from: "them", text: "Hey! Saw you're playing Badminton too, are you joining Thursday's session?", time: "Mon, 6:04 PM" },
    { from: "me", text: "Yeah I saw the game listing, thinking about it. What time does it start?", time: "Mon, 6:06 PM" },
    { from: "them", text: "6:30 PM at SmashCourt. Should be a good competitive game.", time: "Mon, 6:07 PM" },
    { from: "me", text: "Nice, count me in then. Been working on my serve lately.", time: "Mon, 6:10 PM" },
    { from: "them", text: "Haha good, mine's still shaky. See you there!", time: "Mon, 6:11 PM" },
    { from: "them", text: "Also did you check the funding page? There's a scholarship listed for juniors.", time: "Tue, 9:15 AM" },
    { from: "me", text: "Not yet, will take a look today. Thanks for the heads up!", time: "Tue, 9:20 AM" },
  ],
  p2: [
    { from: "them", text: "GG on Sunday's match, that last goal was clean.", time: "Sun, 8:45 AM" },
    { from: "me", text: "Thanks man, your through ball set it up perfectly.", time: "Sun, 8:47 AM" },
    { from: "them", text: "We should run it back next week, same turf?", time: "Sun, 8:48 AM" },
    { from: "me", text: "Works for me. Let's get the squad together again.", time: "Sun, 8:50 AM" },
    { from: "them", text: "I'll ping Arjun and Vikram too.", time: "Sun, 8:51 AM" },
    { from: "me", text: "Sounds good. Evening slot or morning?", time: "Sun, 9:02 AM" },
    { from: "them", text: "Evening's better for me, floodlights are solid at Greenfield.", time: "Sun, 9:05 AM" },
  ],
  p4: [
    { from: "me", text: "That was a full 10-a-side game yesterday, good turnout.", time: "Thu, 7:40 PM" },
    { from: "them", text: "Yeah it filled up fast. Your rating must've jumped after that win.", time: "Thu, 7:42 PM" },
    { from: "me", text: "A bit, streak's at 6 now. Trying to keep it going.", time: "Thu, 7:43 PM" },
    { from: "them", text: "Nice, mine's at 14. Don't want to jinx it haha", time: "Thu, 7:45 PM" },
    { from: "me", text: "Respect. You're always in Koramangala games, we should set a weekly one.", time: "Thu, 7:50 PM" },
    { from: "them", text: "I'm down. Weekday evenings work best for me.", time: "Thu, 7:52 PM" },
    { from: "them", text: "I'll create the game listing tonight, join once it's up.", time: "Thu, 8:00 PM" },
  ],
  p5: [
    { from: "them", text: "Hey, thanks for accepting my friend request!", time: "Yesterday, 11:20 AM" },
    { from: "me", text: "Of course, saw you play both Badminton and Basketball, that's a solid combo.", time: "Yesterday, 11:25 AM" },
    { from: "them", text: "Badminton's my main game, basketball's more for fun on weekends.", time: "Yesterday, 11:26 AM" },
    { from: "me", text: "Same energy here with football and badminton.", time: "Yesterday, 11:28 AM" },
    { from: "them", text: "We should get a mixed doubles game going sometime.", time: "Yesterday, 11:30 AM" },
    { from: "me", text: "Definitely, let me check the courts near BTM Layout.", time: "Yesterday, 11:32 AM" },
    { from: "them", text: "SmashCourt's decent, or Jayanagar Shuttle Point if you don't mind the drive.", time: "Yesterday, 11:35 AM" },
  ],
  p6: [
    { from: "them", text: "Bro that team balancing was spot on last game, 96 balance score.", time: "Tue, 6:12 PM" },
    { from: "me", text: "Yeah the AI actually nailed it this time, both sides were even.", time: "Tue, 6:14 PM" },
    { from: "them", text: "Basketball this Sunday? Marathahalli court is free morning slot.", time: "Tue, 6:16 PM" },
    { from: "me", text: "I'm more of a football guy but sure, I'll tag along.", time: "Tue, 6:18 PM" },
    { from: "them", text: "It'll be casual, friendly play only, no pressure.", time: "Tue, 6:19 PM" },
    { from: "me", text: "Perfect, count me in then.", time: "Tue, 6:20 PM" },
    { from: "them", text: "I'll send the venue pin closer to the day.", time: "Tue, 6:21 PM" },
  ],
  p7: [
    { from: "them", text: "Hi! I sent a friend request after our Badminton match last week.", time: "3 days ago" },
    { from: "me", text: "Oh that game was fun, your smash game is strong.", time: "3 days ago" },
    { from: "them", text: "Thanks! Been training evenings and Sunday mornings mostly.", time: "3 days ago" },
    { from: "me", text: "Same schedule as me actually, weekday evenings work well.", time: "2 days ago" },
    { from: "them", text: "Jayanagar's got a good court near me if you ever want a rematch.", time: "2 days ago" },
    { from: "me", text: "For sure, I'll check my calendar and set something up.", time: "2 days ago" },
  ],
};

// Generic fallback replies used when a friend doesn't have a scripted response for a new message,
// just to keep the demo conversation feeling alive.
export const friendAutoReplies = [
  "Sounds good!",
  "Haha true, let's plan around it.",
  "I'm free most evenings this week, let me know.",
  "Nice, keep me posted.",
  "For sure, see you on the pitch.",
  "That works for me.",
];

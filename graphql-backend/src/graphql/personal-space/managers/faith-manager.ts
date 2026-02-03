import { CosmosDataSource } from "../../../utils/database";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import {
  daily_passage_type,
  prayer_journal_type,
  scripture_reflection_type,
  create_prayer_journal_input,
  update_prayer_journal_input,
  create_scripture_reflection_input,
  update_scripture_reflection_input,
  reflect_on_passage_input,
  prayer_journal_response,
  scripture_reflection_response,
  daily_passage_response,
  delete_faith_response,
  daily_passage_filters,
  prayer_journal_filters,
  scripture_reflection_filters,
  faith_stats,
  prayer_status,
  prayer_type
} from "../types/faith-types";

// Daily passages - 365 passages for a full year of daily devotionals (NIV)
// Organized by themes that cycle through the year
const DAILY_PASSAGES = [
  // FAITH & TRUST (Days 1-30)
  { reference: "Psalm 23:1-3", text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", book: "Psalms", chapter: 23, verseStart: 1, verseEnd: 3 },
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: 6 },
  { reference: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: 10 },
  { reference: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see.", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 37:5", text: "Commit your way to the Lord; trust in him and he will do this.", book: "Psalms", chapter: 37, verseStart: 5, verseEnd: 5 },
  { reference: "2 Corinthians 5:7", text: "For we live by faith, not by sight.", book: "2 Corinthians", chapter: 5, verseStart: 7, verseEnd: 7 },
  { reference: "Psalm 56:3-4", text: "When I am afraid, I put my trust in you. In God, whose word I praise—in God I trust and am not afraid.", book: "Psalms", chapter: 56, verseStart: 3, verseEnd: 4 },
  { reference: "Jeremiah 17:7-8", text: "Blessed is the one who trusts in the Lord, whose confidence is in him. They will be like a tree planted by the water that sends out its roots by the stream.", book: "Jeremiah", chapter: 17, verseStart: 7, verseEnd: 8 },
  { reference: "Nahum 1:7", text: "The Lord is good, a refuge in times of trouble. He cares for those who trust in him.", book: "Nahum", chapter: 1, verseStart: 7, verseEnd: 7 },
  { reference: "Psalm 91:2", text: "I will say of the Lord, 'He is my refuge and my fortress, my God, in whom I trust.'", book: "Psalms", chapter: 91, verseStart: 2, verseEnd: 2 },
  { reference: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.", book: "Romans", chapter: 15, verseStart: 13, verseEnd: 13 },
  { reference: "Psalm 62:8", text: "Trust in him at all times, you people; pour out your hearts to him, for God is our refuge.", book: "Psalms", chapter: 62, verseStart: 8, verseEnd: 8 },
  { reference: "Isaiah 26:3-4", text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you. Trust in the Lord forever, for the Lord, the Lord himself, is the Rock eternal.", book: "Isaiah", chapter: 26, verseStart: 3, verseEnd: 4 },
  { reference: "Psalm 118:8", text: "It is better to take refuge in the Lord than to trust in humans.", book: "Psalms", chapter: 118, verseStart: 8, verseEnd: 8 },
  { reference: "Proverbs 29:25", text: "Fear of man will prove to be a snare, but whoever trusts in the Lord is kept safe.", book: "Proverbs", chapter: 29, verseStart: 25, verseEnd: 25 },
  { reference: "Psalm 20:7", text: "Some trust in chariots and some in horses, but we trust in the name of the Lord our God.", book: "Psalms", chapter: 20, verseStart: 7, verseEnd: 7 },
  { reference: "Isaiah 12:2", text: "Surely God is my salvation; I will trust and not be afraid. The Lord, the Lord himself, is my strength and my defense.", book: "Isaiah", chapter: 12, verseStart: 2, verseEnd: 2 },
  { reference: "Psalm 9:10", text: "Those who know your name trust in you, for you, Lord, have never forsaken those who seek you.", book: "Psalms", chapter: 9, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 28:7", text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", book: "Psalms", chapter: 28, verseStart: 7, verseEnd: 7 },
  { reference: "Proverbs 16:20", text: "Whoever gives heed to instruction prospers, and blessed is the one who trusts in the Lord.", book: "Proverbs", chapter: 16, verseStart: 20, verseEnd: 20 },
  { reference: "Psalm 112:7", text: "They will have no fear of bad news; their hearts are steadfast, trusting in the Lord.", book: "Psalms", chapter: 112, verseStart: 7, verseEnd: 7 },
  { reference: "Psalm 143:8", text: "Let the morning bring me word of your unfailing love, for I have put my trust in you.", book: "Psalms", chapter: 143, verseStart: 8, verseEnd: 8 },
  { reference: "Isaiah 50:10", text: "Who among you fears the Lord and obeys the word of his servant? Let the one who walks in the dark, who has no light, trust in the name of the Lord.", book: "Isaiah", chapter: 50, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 31:14", text: "But I trust in you, Lord; I say, 'You are my God.'", book: "Psalms", chapter: 31, verseStart: 14, verseEnd: 14 },
  { reference: "Psalm 52:8", text: "But I am like an olive tree flourishing in the house of God; I trust in God's unfailing love for ever and ever.", book: "Psalms", chapter: 52, verseStart: 8, verseEnd: 8 },
  { reference: "Psalm 13:5", text: "But I trust in your unfailing love; my heart rejoices in your salvation.", book: "Psalms", chapter: 13, verseStart: 5, verseEnd: 5 },
  { reference: "Psalm 40:4", text: "Blessed is the one who trusts in the Lord, who does not look to the proud, to those who turn aside to false gods.", book: "Psalms", chapter: 40, verseStart: 4, verseEnd: 4 },
  { reference: "Psalm 84:12", text: "Lord Almighty, blessed is the one who trusts in you.", book: "Psalms", chapter: 84, verseStart: 12, verseEnd: 12 },
  { reference: "Psalm 125:1", text: "Those who trust in the Lord are like Mount Zion, which cannot be shaken but endures forever.", book: "Psalms", chapter: 125, verseStart: 1, verseEnd: 1 },
  { reference: "1 Chronicles 5:20", text: "They were helped in fighting them, and God delivered the Hagrites and all their allies into their hands, because they cried out to him during the battle. He answered their prayers, because they trusted in him.", book: "1 Chronicles", chapter: 5, verseStart: 20, verseEnd: 20 },

  // LOVE (Days 31-60)
  { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", book: "John", chapter: 3, verseStart: 16, verseEnd: 16 },
  { reference: "1 Corinthians 13:4-7", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs. Love does not delight in evil but rejoices with the truth. It always protects, always trusts, always hopes, always perseveres.", book: "1 Corinthians", chapter: 13, verseStart: 4, verseEnd: 7 },
  { reference: "Romans 8:38-39", text: "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.", book: "Romans", chapter: 8, verseStart: 38, verseEnd: 39 },
  { reference: "1 John 4:19", text: "We love because he first loved us.", book: "1 John", chapter: 4, verseStart: 19, verseEnd: 19 },
  { reference: "1 John 4:7-8", text: "Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God. Whoever does not love does not know God, because God is love.", book: "1 John", chapter: 4, verseStart: 7, verseEnd: 8 },
  { reference: "John 15:12-13", text: "My command is this: Love each other as I have loved you. Greater love has no one than this: to lay down one's life for one's friends.", book: "John", chapter: 15, verseStart: 12, verseEnd: 13 },
  { reference: "Romans 13:10", text: "Love does no harm to a neighbor. Therefore love is the fulfillment of the law.", book: "Romans", chapter: 13, verseStart: 10, verseEnd: 10 },
  { reference: "Ephesians 4:2", text: "Be completely humble and gentle; be patient, bearing with one another in love.", book: "Ephesians", chapter: 4, verseStart: 2, verseEnd: 2 },
  { reference: "Colossians 3:14", text: "And over all these virtues put on love, which binds them all together in perfect unity.", book: "Colossians", chapter: 3, verseStart: 14, verseEnd: 14 },
  { reference: "1 Peter 4:8", text: "Above all, love each other deeply, because love covers over a multitude of sins.", book: "1 Peter", chapter: 4, verseStart: 8, verseEnd: 8 },
  { reference: "1 John 3:18", text: "Dear children, let us not love with words or speech but with actions and in truth.", book: "1 John", chapter: 3, verseStart: 18, verseEnd: 18 },
  { reference: "Mark 12:30-31", text: "Love the Lord your God with all your heart and with all your soul and with all your mind and with all your strength. The second is this: Love your neighbor as yourself.", book: "Mark", chapter: 12, verseStart: 30, verseEnd: 31 },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: 23 },
  { reference: "1 Corinthians 16:14", text: "Do everything in love.", book: "1 Corinthians", chapter: 16, verseStart: 14, verseEnd: 14 },
  { reference: "Proverbs 10:12", text: "Hatred stirs up conflict, but love covers over all wrongs.", book: "Proverbs", chapter: 10, verseStart: 12, verseEnd: 12 },
  { reference: "Romans 12:9-10", text: "Love must be sincere. Hate what is evil; cling to what is good. Be devoted to one another in love. Honor one another above yourselves.", book: "Romans", chapter: 12, verseStart: 9, verseEnd: 10 },
  { reference: "1 John 4:11-12", text: "Dear friends, since God so loved us, we also ought to love one another. No one has ever seen God; but if we love one another, God lives in us and his love is made complete in us.", book: "1 John", chapter: 4, verseStart: 11, verseEnd: 12 },
  { reference: "Ephesians 5:2", text: "And walk in the way of love, just as Christ loved us and gave himself up for us as a fragrant offering and sacrifice to God.", book: "Ephesians", chapter: 5, verseStart: 2, verseEnd: 2 },
  { reference: "Song of Songs 8:7", text: "Many waters cannot quench love; rivers cannot sweep it away.", book: "Song of Songs", chapter: 8, verseStart: 7, verseEnd: 7 },
  { reference: "1 John 4:16", text: "And so we know and rely on the love God has for us. God is love. Whoever lives in love lives in God, and God in them.", book: "1 John", chapter: 4, verseStart: 16, verseEnd: 16 },
  { reference: "John 13:34-35", text: "A new command I give you: Love one another. As I have loved you, so you must love one another. By this everyone will know that you are my disciples, if you love one another.", book: "John", chapter: 13, verseStart: 34, verseEnd: 35 },
  { reference: "Romans 5:8", text: "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.", book: "Romans", chapter: 5, verseStart: 8, verseEnd: 8 },
  { reference: "1 Thessalonians 3:12", text: "May the Lord make your love increase and overflow for each other and for everyone else.", book: "1 Thessalonians", chapter: 3, verseStart: 12, verseEnd: 12 },
  { reference: "Zephaniah 3:17", text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", book: "Zephaniah", chapter: 3, verseStart: 17, verseEnd: 17 },
  { reference: "1 John 4:18", text: "There is no fear in love. But perfect love drives out fear.", book: "1 John", chapter: 4, verseStart: 18, verseEnd: 18 },
  { reference: "Deuteronomy 7:9", text: "Know therefore that the Lord your God is God; he is the faithful God, keeping his covenant of love to a thousand generations of those who love him and keep his commandments.", book: "Deuteronomy", chapter: 7, verseStart: 9, verseEnd: 9 },
  { reference: "Psalm 136:26", text: "Give thanks to the God of heaven. His love endures forever.", book: "Psalms", chapter: 136, verseStart: 26, verseEnd: 26 },
  { reference: "Jeremiah 31:3", text: "The Lord appeared to us in the past, saying: 'I have loved you with an everlasting love; I have drawn you with unfailing kindness.'", book: "Jeremiah", chapter: 31, verseStart: 3, verseEnd: 3 },
  { reference: "Psalm 86:15", text: "But you, Lord, are a compassionate and gracious God, slow to anger, abounding in love and faithfulness.", book: "Psalms", chapter: 86, verseStart: 15, verseEnd: 15 },
  { reference: "1 Corinthians 13:13", text: "And now these three remain: faith, hope and love. But the greatest of these is love.", book: "1 Corinthians", chapter: 13, verseStart: 13, verseEnd: 13 },

  // PEACE & REST (Days 61-90)
  { reference: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: 7 },
  { reference: "Matthew 11:28-30", text: "Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls. For my yoke is easy and my burden is light.", book: "Matthew", chapter: 11, verseStart: 28, verseEnd: 30 },
  { reference: "John 14:27", text: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.", book: "John", chapter: 14, verseStart: 27, verseEnd: 27 },
  { reference: "Isaiah 26:3", text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.", book: "Isaiah", chapter: 26, verseStart: 3, verseEnd: 3 },
  { reference: "Psalm 4:8", text: "In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.", book: "Psalms", chapter: 4, verseStart: 8, verseEnd: 8 },
  { reference: "Colossians 3:15", text: "Let the peace of Christ rule in your hearts, since as members of one body you were called to peace. And be thankful.", book: "Colossians", chapter: 3, verseStart: 15, verseEnd: 15 },
  { reference: "Romans 8:6", text: "The mind governed by the flesh is death, but the mind governed by the Spirit is life and peace.", book: "Romans", chapter: 8, verseStart: 6, verseEnd: 6 },
  { reference: "Psalm 29:11", text: "The Lord gives strength to his people; the Lord blesses his people with peace.", book: "Psalms", chapter: 29, verseStart: 11, verseEnd: 11 },
  { reference: "Isaiah 32:17", text: "The fruit of that righteousness will be peace; its effect will be quietness and confidence forever.", book: "Isaiah", chapter: 32, verseStart: 17, verseEnd: 17 },
  { reference: "2 Thessalonians 3:16", text: "Now may the Lord of peace himself give you peace at all times and in every way.", book: "2 Thessalonians", chapter: 3, verseStart: 16, verseEnd: 16 },
  { reference: "Psalm 119:165", text: "Great peace have those who love your law, and nothing can make them stumble.", book: "Psalms", chapter: 119, verseStart: 165, verseEnd: 165 },
  { reference: "Isaiah 54:10", text: "Though the mountains be shaken and the hills be removed, yet my unfailing love for you will not be shaken nor my covenant of peace be removed.", book: "Isaiah", chapter: 54, verseStart: 10, verseEnd: 10 },
  { reference: "Numbers 6:24-26", text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace.", book: "Numbers", chapter: 6, verseStart: 24, verseEnd: 26 },
  { reference: "Romans 5:1", text: "Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ.", book: "Romans", chapter: 5, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 85:8", text: "I will listen to what God the Lord says; he promises peace to his people, his faithful servants.", book: "Psalms", chapter: 85, verseStart: 8, verseEnd: 8 },
  { reference: "James 3:18", text: "Peacemakers who sow in peace reap a harvest of righteousness.", book: "James", chapter: 3, verseStart: 18, verseEnd: 18 },
  { reference: "Psalm 34:14", text: "Turn from evil and do good; seek peace and pursue it.", book: "Psalms", chapter: 34, verseStart: 14, verseEnd: 14 },
  { reference: "Matthew 5:9", text: "Blessed are the peacemakers, for they will be called children of God.", book: "Matthew", chapter: 5, verseStart: 9, verseEnd: 9 },
  { reference: "Hebrews 12:14", text: "Make every effort to live in peace with everyone and to be holy; without holiness no one will see the Lord.", book: "Hebrews", chapter: 12, verseStart: 14, verseEnd: 14 },
  { reference: "Romans 14:17", text: "For the kingdom of God is not a matter of eating and drinking, but of righteousness, peace and joy in the Holy Spirit.", book: "Romans", chapter: 14, verseStart: 17, verseEnd: 17 },
  { reference: "Psalm 37:11", text: "But the meek will inherit the land and enjoy peace and prosperity.", book: "Psalms", chapter: 37, verseStart: 11, verseEnd: 11 },
  { reference: "Isaiah 9:6", text: "For to us a child is born, to us a son is given, and the government will be on his shoulders. And he will be called Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace.", book: "Isaiah", chapter: 9, verseStart: 6, verseEnd: 6 },
  { reference: "Romans 12:18", text: "If it is possible, as far as it depends on you, live at peace with everyone.", book: "Romans", chapter: 12, verseStart: 18, verseEnd: 18 },
  { reference: "Psalm 122:6-7", text: "Pray for the peace of Jerusalem: May those who love you be secure. May there be peace within your walls and security within your citadels.", book: "Psalms", chapter: 122, verseStart: 6, verseEnd: 7 },
  { reference: "Isaiah 48:18", text: "If only you had paid attention to my commands, your peace would have been like a river, your well-being like the waves of the sea.", book: "Isaiah", chapter: 48, verseStart: 18, verseEnd: 18 },
  { reference: "Ephesians 2:14", text: "For he himself is our peace, who has made the two groups one and has destroyed the barrier, the dividing wall of hostility.", book: "Ephesians", chapter: 2, verseStart: 14, verseEnd: 14 },
  { reference: "Psalm 46:10", text: "He says, 'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.'", book: "Psalms", chapter: 46, verseStart: 10, verseEnd: 10 },
  { reference: "Isaiah 57:2", text: "Those who walk uprightly enter into peace; they find rest as they lie in death.", book: "Isaiah", chapter: 57, verseStart: 2, verseEnd: 2 },
  { reference: "Psalm 131:2", text: "But I have calmed and quieted myself, I am like a weaned child with its mother; like a weaned child I am content.", book: "Psalms", chapter: 131, verseStart: 2, verseEnd: 2 },
  { reference: "Mark 4:39", text: "He got up, rebuked the wind and said to the waves, 'Quiet! Be still!' Then the wind died down and it was completely calm.", book: "Mark", chapter: 4, verseStart: 39, verseEnd: 39 },

  // STRENGTH & COURAGE (Days 91-120)
  { reference: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", book: "Joshua", chapter: 1, verseStart: 9, verseEnd: 9 },
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: 31 },
  { reference: "Philippians 4:13", text: "I can do all this through him who gives me strength.", book: "Philippians", chapter: 4, verseStart: 13, verseEnd: 13 },
  { reference: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you.", book: "Deuteronomy", chapter: 31, verseStart: 6, verseEnd: 6 },
  { reference: "Psalm 27:1", text: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?", book: "Psalms", chapter: 27, verseStart: 1, verseEnd: 1 },
  { reference: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", book: "2 Timothy", chapter: 1, verseStart: 7, verseEnd: 7 },
  { reference: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 18:32", text: "It is God who arms me with strength and keeps my way secure.", book: "Psalms", chapter: 18, verseStart: 32, verseEnd: 32 },
  { reference: "Ephesians 6:10", text: "Finally, be strong in the Lord and in his mighty power.", book: "Ephesians", chapter: 6, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 46:1-2", text: "God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea.", book: "Psalms", chapter: 46, verseStart: 1, verseEnd: 2 },
  { reference: "2 Corinthians 12:9", text: "But he said to me, 'My grace is sufficient for you, for my power is made perfect in weakness.' Therefore I will boast all the more gladly about my weaknesses, so that Christ's power may rest on me.", book: "2 Corinthians", chapter: 12, verseStart: 9, verseEnd: 9 },
  { reference: "Nehemiah 8:10", text: "Do not grieve, for the joy of the Lord is your strength.", book: "Nehemiah", chapter: 8, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 73:26", text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever.", book: "Psalms", chapter: 73, verseStart: 26, verseEnd: 26 },
  { reference: "Isaiah 40:29", text: "He gives strength to the weary and increases the power of the weak.", book: "Isaiah", chapter: 40, verseStart: 29, verseEnd: 29 },
  { reference: "Psalm 28:7", text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me. My heart leaps for joy, and with my song I praise him.", book: "Psalms", chapter: 28, verseStart: 7, verseEnd: 7 },
  { reference: "Habakkuk 3:19", text: "The Sovereign Lord is my strength; he makes my feet like the feet of a deer, he enables me to tread on the heights.", book: "Habakkuk", chapter: 3, verseStart: 19, verseEnd: 19 },
  { reference: "Psalm 118:14", text: "The Lord is my strength and my defense; he has become my salvation.", book: "Psalms", chapter: 118, verseStart: 14, verseEnd: 14 },
  { reference: "1 Chronicles 16:11", text: "Look to the Lord and his strength; seek his face always.", book: "1 Chronicles", chapter: 16, verseStart: 11, verseEnd: 11 },
  { reference: "Psalm 138:3", text: "When I called, you answered me; you greatly emboldened me.", book: "Psalms", chapter: 138, verseStart: 3, verseEnd: 3 },
  { reference: "Exodus 15:2", text: "The Lord is my strength and my defense; he has become my salvation. He is my God, and I will praise him, my father's God, and I will exalt him.", book: "Exodus", chapter: 15, verseStart: 2, verseEnd: 2 },
  { reference: "Psalm 59:16", text: "But I will sing of your strength, in the morning I will sing of your love; for you are my fortress, my refuge in times of trouble.", book: "Psalms", chapter: 59, verseStart: 16, verseEnd: 16 },
  { reference: "Isaiah 30:15", text: "In repentance and rest is your salvation, in quietness and trust is your strength.", book: "Isaiah", chapter: 30, verseStart: 15, verseEnd: 15 },
  { reference: "Psalm 31:24", text: "Be strong and take heart, all you who hope in the Lord.", book: "Psalms", chapter: 31, verseStart: 24, verseEnd: 24 },
  { reference: "1 Corinthians 16:13", text: "Be on your guard; stand firm in the faith; be courageous; be strong.", book: "1 Corinthians", chapter: 16, verseStart: 13, verseEnd: 13 },
  { reference: "Psalm 89:21", text: "My hand will sustain him; surely my arm will strengthen him.", book: "Psalms", chapter: 89, verseStart: 21, verseEnd: 21 },
  { reference: "2 Samuel 22:33", text: "It is God who arms me with strength and keeps my way secure.", book: "2 Samuel", chapter: 22, verseStart: 33, verseEnd: 33 },
  { reference: "Psalm 105:4", text: "Look to the Lord and his strength; seek his face always.", book: "Psalms", chapter: 105, verseStart: 4, verseEnd: 4 },
  { reference: "Zechariah 4:6", text: "'Not by might nor by power, but by my Spirit,' says the Lord Almighty.", book: "Zechariah", chapter: 4, verseStart: 6, verseEnd: 6 },
  { reference: "Psalm 68:35", text: "You, God, are awesome in your sanctuary; the God of Israel gives power and strength to his people. Praise be to God!", book: "Psalms", chapter: 68, verseStart: 35, verseEnd: 35 },
  { reference: "Colossians 1:11", text: "Being strengthened with all power according to his glorious might so that you may have great endurance and patience.", book: "Colossians", chapter: 1, verseStart: 11, verseEnd: 11 },

  // HOPE & FUTURE (Days 121-150)
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: 11 },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", book: "Romans", chapter: 8, verseStart: 28, verseEnd: 28 },
  { reference: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.", book: "Romans", chapter: 15, verseStart: 13, verseEnd: 13 },
  { reference: "Hebrews 6:19", text: "We have this hope as an anchor for the soul, firm and secure.", book: "Hebrews", chapter: 6, verseStart: 19, verseEnd: 19 },
  { reference: "Lamentations 3:22-23", text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.", book: "Lamentations", chapter: 3, verseStart: 22, verseEnd: 23 },
  { reference: "Psalm 33:18", text: "But the eyes of the Lord are on those who fear him, on those whose hope is in his unfailing love.", book: "Psalms", chapter: 33, verseStart: 18, verseEnd: 18 },
  { reference: "1 Peter 1:3", text: "Praise be to the God and Father of our Lord Jesus Christ! In his great mercy he has given us new birth into a living hope through the resurrection of Jesus Christ from the dead.", book: "1 Peter", chapter: 1, verseStart: 3, verseEnd: 3 },
  { reference: "Psalm 71:5", text: "For you have been my hope, Sovereign Lord, my confidence since my youth.", book: "Psalms", chapter: 71, verseStart: 5, verseEnd: 5 },
  { reference: "Romans 5:5", text: "And hope does not put us to shame, because God's love has been poured out into our hearts through the Holy Spirit, who has been given to us.", book: "Romans", chapter: 5, verseStart: 5, verseEnd: 5 },
  { reference: "Psalm 62:5", text: "Yes, my soul, find rest in God; my hope comes from him.", book: "Psalms", chapter: 62, verseStart: 5, verseEnd: 5 },
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: 31 },
  { reference: "Psalm 31:24", text: "Be strong and take heart, all you who hope in the Lord.", book: "Psalms", chapter: 31, verseStart: 24, verseEnd: 24 },
  { reference: "Romans 8:24-25", text: "For in this hope we were saved. But hope that is seen is no hope at all. Who hopes for what they already have? But if we hope for what we do not yet have, we wait for it patiently.", book: "Romans", chapter: 8, verseStart: 24, verseEnd: 25 },
  { reference: "Psalm 130:5", text: "I wait for the Lord, my whole being waits, and in his word I put my hope.", book: "Psalms", chapter: 130, verseStart: 5, verseEnd: 5 },
  { reference: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see.", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 39:7", text: "But now, Lord, what do I look for? My hope is in you.", book: "Psalms", chapter: 39, verseStart: 7, verseEnd: 7 },
  { reference: "1 Timothy 4:10", text: "That is why we labor and strive, because we have put our hope in the living God, who is the Savior of all people, and especially of those who believe.", book: "1 Timothy", chapter: 4, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 119:114", text: "You are my refuge and my shield; I have put my hope in your word.", book: "Psalms", chapter: 119, verseStart: 114, verseEnd: 114 },
  { reference: "Titus 2:13", text: "While we wait for the blessed hope—the appearing of the glory of our great God and Savior, Jesus Christ.", book: "Titus", chapter: 2, verseStart: 13, verseEnd: 13 },
  { reference: "Psalm 146:5", text: "Blessed are those whose help is the God of Jacob, whose hope is in the Lord their God.", book: "Psalms", chapter: 146, verseStart: 5, verseEnd: 5 },
  { reference: "1 Peter 1:21", text: "Through him you believe in God, who raised him from the dead and glorified him, and so your faith and hope are in God.", book: "1 Peter", chapter: 1, verseStart: 21, verseEnd: 21 },
  { reference: "Psalm 33:22", text: "May your unfailing love be with us, Lord, even as we put our hope in you.", book: "Psalms", chapter: 33, verseStart: 22, verseEnd: 22 },
  { reference: "Colossians 1:27", text: "To them God has chosen to make known among the Gentiles the glorious riches of this mystery, which is Christ in you, the hope of glory.", book: "Colossians", chapter: 1, verseStart: 27, verseEnd: 27 },
  { reference: "Psalm 42:11", text: "Why, my soul, are you downcast? Why so disturbed within me? Put your hope in God, for I will yet praise him, my Savior and my God.", book: "Psalms", chapter: 42, verseStart: 11, verseEnd: 11 },
  { reference: "Romans 12:12", text: "Be joyful in hope, patient in affliction, faithful in prayer.", book: "Romans", chapter: 12, verseStart: 12, verseEnd: 12 },
  { reference: "Psalm 119:81", text: "My soul faints with longing for your salvation, but I have put my hope in your word.", book: "Psalms", chapter: 119, verseStart: 81, verseEnd: 81 },
  { reference: "1 Thessalonians 5:8", text: "But since we belong to the day, let us be sober, putting on faith and love as a breastplate, and the hope of salvation as a helmet.", book: "1 Thessalonians", chapter: 5, verseStart: 8, verseEnd: 8 },
  { reference: "Psalm 119:49", text: "Remember your word to your servant, for you have given me hope.", book: "Psalms", chapter: 119, verseStart: 49, verseEnd: 49 },
  { reference: "1 John 3:3", text: "All who have this hope in him purify themselves, just as he is pure.", book: "1 John", chapter: 3, verseStart: 3, verseEnd: 3 },
  { reference: "Psalm 147:11", text: "The Lord delights in those who fear him, who put their hope in his unfailing love.", book: "Psalms", chapter: 147, verseStart: 11, verseEnd: 11 },

  // WISDOM & GUIDANCE (Days 151-180)
  { reference: "James 1:5", text: "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.", book: "James", chapter: 1, verseStart: 5, verseEnd: 5 },
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: 6 },
  { reference: "Psalm 32:8", text: "I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you.", book: "Psalms", chapter: 32, verseStart: 8, verseEnd: 8 },
  { reference: "Proverbs 2:6", text: "For the Lord gives wisdom; from his mouth come knowledge and understanding.", book: "Proverbs", chapter: 2, verseStart: 6, verseEnd: 6 },
  { reference: "Isaiah 30:21", text: "Whether you turn to the right or to the left, your ears will hear a voice behind you, saying, 'This is the way; walk in it.'", book: "Isaiah", chapter: 30, verseStart: 21, verseEnd: 21 },
  { reference: "Proverbs 4:7", text: "The beginning of wisdom is this: Get wisdom. Though it cost all you have, get understanding.", book: "Proverbs", chapter: 4, verseStart: 7, verseEnd: 7 },
  { reference: "Psalm 119:105", text: "Your word is a lamp for my feet, a light on my path.", book: "Psalms", chapter: 119, verseStart: 105, verseEnd: 105 },
  { reference: "Proverbs 9:10", text: "The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding.", book: "Proverbs", chapter: 9, verseStart: 10, verseEnd: 10 },
  { reference: "Colossians 3:16", text: "Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom.", book: "Colossians", chapter: 3, verseStart: 16, verseEnd: 16 },
  { reference: "Proverbs 16:9", text: "In their hearts humans plan their course, but the Lord establishes their steps.", book: "Proverbs", chapter: 16, verseStart: 9, verseEnd: 9 },
  { reference: "James 3:17", text: "But the wisdom that comes from heaven is first of all pure; then peace-loving, considerate, submissive, full of mercy and good fruit, impartial and sincere.", book: "James", chapter: 3, verseStart: 17, verseEnd: 17 },
  { reference: "Proverbs 11:2", text: "When pride comes, then comes disgrace, but with humility comes wisdom.", book: "Proverbs", chapter: 11, verseStart: 2, verseEnd: 2 },
  { reference: "Psalm 37:23", text: "The Lord makes firm the steps of the one who delights in him.", book: "Psalms", chapter: 37, verseStart: 23, verseEnd: 23 },
  { reference: "Proverbs 19:20", text: "Listen to advice and accept discipline, and at the end you will be counted among the wise.", book: "Proverbs", chapter: 19, verseStart: 20, verseEnd: 20 },
  { reference: "Ecclesiastes 7:12", text: "Wisdom is a shelter as money is a shelter, but the advantage of knowledge is this: Wisdom preserves those who have it.", book: "Ecclesiastes", chapter: 7, verseStart: 12, verseEnd: 12 },
  { reference: "Proverbs 1:7", text: "The fear of the Lord is the beginning of knowledge, but fools despise wisdom and instruction.", book: "Proverbs", chapter: 1, verseStart: 7, verseEnd: 7 },
  { reference: "Psalm 25:4-5", text: "Show me your ways, Lord, teach me your paths. Guide me in your truth and teach me, for you are God my Savior, and my hope is in you all day long.", book: "Psalms", chapter: 25, verseStart: 4, verseEnd: 5 },
  { reference: "Proverbs 12:15", text: "The way of fools seems right to them, but the wise listen to advice.", book: "Proverbs", chapter: 12, verseStart: 15, verseEnd: 15 },
  { reference: "1 Corinthians 1:30", text: "It is because of him that you are in Christ Jesus, who has become for us wisdom from God—that is, our righteousness, holiness and redemption.", book: "1 Corinthians", chapter: 1, verseStart: 30, verseEnd: 30 },
  { reference: "Proverbs 13:10", text: "Where there is strife, there is pride, but wisdom is found in those who take advice.", book: "Proverbs", chapter: 13, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 48:14", text: "For this God is our God for ever and ever; he will be our guide even to the end.", book: "Psalms", chapter: 48, verseStart: 14, verseEnd: 14 },
  { reference: "Proverbs 15:22", text: "Plans fail for lack of counsel, but with many advisers they succeed.", book: "Proverbs", chapter: 15, verseStart: 22, verseEnd: 22 },
  { reference: "Ecclesiastes 2:26", text: "To the person who pleases him, God gives wisdom, knowledge and happiness.", book: "Ecclesiastes", chapter: 2, verseStart: 26, verseEnd: 26 },
  { reference: "Proverbs 24:3-4", text: "By wisdom a house is built, and through understanding it is established; through knowledge its rooms are filled with rare and beautiful treasures.", book: "Proverbs", chapter: 24, verseStart: 3, verseEnd: 4 },
  { reference: "Daniel 2:21", text: "He changes times and seasons; he deposes kings and raises up others. He gives wisdom to the wise and knowledge to the discerning.", book: "Daniel", chapter: 2, verseStart: 21, verseEnd: 21 },
  { reference: "Proverbs 8:11", text: "For wisdom is more precious than rubies, and nothing you desire can compare with her.", book: "Proverbs", chapter: 8, verseStart: 11, verseEnd: 11 },
  { reference: "Psalm 73:24", text: "You guide me with your counsel, and afterward you will take me into glory.", book: "Psalms", chapter: 73, verseStart: 24, verseEnd: 24 },
  { reference: "Proverbs 14:29", text: "Whoever is patient has great understanding, but one who is quick-tempered displays folly.", book: "Proverbs", chapter: 14, verseStart: 29, verseEnd: 29 },
  { reference: "Ephesians 1:17", text: "I keep asking that the God of our Lord Jesus Christ, the glorious Father, may give you the Spirit of wisdom and revelation, so that you may know him better.", book: "Ephesians", chapter: 1, verseStart: 17, verseEnd: 17 },
  { reference: "Proverbs 16:16", text: "How much better to get wisdom than gold, to get insight rather than silver!", book: "Proverbs", chapter: 16, verseStart: 16, verseEnd: 16 },

  // FORGIVENESS & GRACE (Days 181-210)
  { reference: "Ephesians 4:32", text: "Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.", book: "Ephesians", chapter: 4, verseStart: 32, verseEnd: 32 },
  { reference: "1 John 1:9", text: "If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness.", book: "1 John", chapter: 1, verseStart: 9, verseEnd: 9 },
  { reference: "Colossians 3:13", text: "Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.", book: "Colossians", chapter: 3, verseStart: 13, verseEnd: 13 },
  { reference: "Psalm 103:12", text: "As far as the east is from the west, so far has he removed our transgressions from us.", book: "Psalms", chapter: 103, verseStart: 12, verseEnd: 12 },
  { reference: "Matthew 6:14-15", text: "For if you forgive other people when they sin against you, your heavenly Father will also forgive you. But if you do not forgive others their sins, your Father will not forgive your sins.", book: "Matthew", chapter: 6, verseStart: 14, verseEnd: 15 },
  { reference: "Isaiah 1:18", text: "Come now, let us settle the matter, says the Lord. Though your sins are like scarlet, they shall be as white as snow; though they are red as crimson, they shall be like wool.", book: "Isaiah", chapter: 1, verseStart: 18, verseEnd: 18 },
  { reference: "Ephesians 2:8-9", text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.", book: "Ephesians", chapter: 2, verseStart: 8, verseEnd: 9 },
  { reference: "Psalm 32:1", text: "Blessed is the one whose transgressions are forgiven, whose sins are covered.", book: "Psalms", chapter: 32, verseStart: 1, verseEnd: 1 },
  { reference: "Romans 3:23-24", text: "For all have sinned and fall short of the glory of God, and all are justified freely by his grace through the redemption that came by Christ Jesus.", book: "Romans", chapter: 3, verseStart: 23, verseEnd: 24 },
  { reference: "Micah 7:18", text: "Who is a God like you, who pardons sin and forgives the transgression of the remnant of his inheritance? You do not stay angry forever but delight to show mercy.", book: "Micah", chapter: 7, verseStart: 18, verseEnd: 18 },
  { reference: "2 Corinthians 12:9", text: "But he said to me, 'My grace is sufficient for you, for my power is made perfect in weakness.'", book: "2 Corinthians", chapter: 12, verseStart: 9, verseEnd: 9 },
  { reference: "Acts 3:19", text: "Repent, then, and turn to God, so that your sins may be wiped out, that times of refreshing may come from the Lord.", book: "Acts", chapter: 3, verseStart: 19, verseEnd: 19 },
  { reference: "Titus 3:5", text: "He saved us, not because of righteous things we had done, but because of his mercy.", book: "Titus", chapter: 3, verseStart: 5, verseEnd: 5 },
  { reference: "Hebrews 8:12", text: "For I will forgive their wickedness and will remember their sins no more.", book: "Hebrews", chapter: 8, verseStart: 12, verseEnd: 12 },
  { reference: "Romans 6:14", text: "For sin shall no longer be your master, because you are not under the law, but under grace.", book: "Romans", chapter: 6, verseStart: 14, verseEnd: 14 },
  { reference: "Psalm 86:5", text: "You, Lord, are forgiving and good, abounding in love to all who call to you.", book: "Psalms", chapter: 86, verseStart: 5, verseEnd: 5 },
  { reference: "Luke 6:37", text: "Do not judge, and you will not be judged. Do not condemn, and you will not be condemned. Forgive, and you will be forgiven.", book: "Luke", chapter: 6, verseStart: 37, verseEnd: 37 },
  { reference: "Romans 5:20", text: "The law was brought in so that the trespass might increase. But where sin increased, grace increased all the more.", book: "Romans", chapter: 5, verseStart: 20, verseEnd: 20 },
  { reference: "Psalm 130:3-4", text: "If you, Lord, kept a record of sins, Lord, who could stand? But with you there is forgiveness, so that we can, with reverence, serve you.", book: "Psalms", chapter: 130, verseStart: 3, verseEnd: 4 },
  { reference: "Mark 11:25", text: "And when you stand praying, if you hold anything against anyone, forgive them, so that your Father in heaven may forgive you your sins.", book: "Mark", chapter: 11, verseStart: 25, verseEnd: 25 },
  { reference: "John 1:16", text: "Out of his fullness we have all received grace in place of grace already given.", book: "John", chapter: 1, verseStart: 16, verseEnd: 16 },
  { reference: "Isaiah 43:25", text: "I, even I, am he who blots out your transgressions, for my own sake, and remembers your sins no more.", book: "Isaiah", chapter: 43, verseStart: 25, verseEnd: 25 },
  { reference: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: 17 },
  { reference: "Psalm 103:3", text: "Who forgives all your sins and heals all your diseases.", book: "Psalms", chapter: 103, verseStart: 3, verseEnd: 3 },
  { reference: "Matthew 18:21-22", text: "Then Peter came to Jesus and asked, 'Lord, how many times shall I forgive my brother or sister who sins against me? Up to seven times?' Jesus answered, 'I tell you, not seven times, but seventy-seven times.'", book: "Matthew", chapter: 18, verseStart: 21, verseEnd: 22 },
  { reference: "Hebrews 4:16", text: "Let us then approach God's throne of grace with confidence, so that we may receive mercy and find grace to help us in our time of need.", book: "Hebrews", chapter: 4, verseStart: 16, verseEnd: 16 },
  { reference: "Daniel 9:9", text: "The Lord our God is merciful and forgiving, even though we have rebelled against him.", book: "Daniel", chapter: 9, verseStart: 9, verseEnd: 9 },
  { reference: "Romans 8:1", text: "Therefore, there is now no condemnation for those who are in Christ Jesus.", book: "Romans", chapter: 8, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 51:1-2", text: "Have mercy on me, O God, according to your unfailing love; according to your great compassion blot out my transgressions. Wash away all my iniquity and cleanse me from my sin.", book: "Psalms", chapter: 51, verseStart: 1, verseEnd: 2 },
  { reference: "James 4:6", text: "But he gives us more grace. That is why Scripture says: 'God opposes the proud but shows favor to the humble.'", book: "James", chapter: 4, verseStart: 6, verseEnd: 6 },

  // JOY & THANKSGIVING (Days 211-240)
  { reference: "Philippians 4:4", text: "Rejoice in the Lord always. I will say it again: Rejoice!", book: "Philippians", chapter: 4, verseStart: 4, verseEnd: 4 },
  { reference: "1 Thessalonians 5:16-18", text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus.", book: "1 Thessalonians", chapter: 5, verseStart: 16, verseEnd: 18 },
  { reference: "Psalm 118:24", text: "The Lord has done it this very day; let us rejoice today and be glad.", book: "Psalms", chapter: 118, verseStart: 24, verseEnd: 24 },
  { reference: "Nehemiah 8:10", text: "Do not grieve, for the joy of the Lord is your strength.", book: "Nehemiah", chapter: 8, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 16:11", text: "You make known to me the path of life; you will fill me with joy in your presence, with eternal pleasures at your right hand.", book: "Psalms", chapter: 16, verseStart: 11, verseEnd: 11 },
  { reference: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.", book: "Romans", chapter: 15, verseStart: 13, verseEnd: 13 },
  { reference: "Psalm 30:5", text: "For his anger lasts only a moment, but his favor lasts a lifetime; weeping may stay for the night, but rejoicing comes in the morning.", book: "Psalms", chapter: 30, verseStart: 5, verseEnd: 5 },
  { reference: "John 15:11", text: "I have told you this so that my joy may be in you and your joy may be complete.", book: "John", chapter: 15, verseStart: 11, verseEnd: 11 },
  { reference: "Psalm 100:1-2", text: "Shout for joy to the Lord, all the earth. Worship the Lord with gladness; come before him with joyful songs.", book: "Psalms", chapter: 100, verseStart: 1, verseEnd: 2 },
  { reference: "James 1:2-3", text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.", book: "James", chapter: 1, verseStart: 2, verseEnd: 3 },
  { reference: "Psalm 126:3", text: "The Lord has done great things for us, and we are filled with joy.", book: "Psalms", chapter: 126, verseStart: 3, verseEnd: 3 },
  { reference: "1 Peter 1:8", text: "Though you have not seen him, you love him; and even though you do not see him now, you believe in him and are filled with an inexpressible and glorious joy.", book: "1 Peter", chapter: 1, verseStart: 8, verseEnd: 8 },
  { reference: "Psalm 5:11", text: "But let all who take refuge in you be glad; let them ever sing for joy.", book: "Psalms", chapter: 5, verseStart: 11, verseEnd: 11 },
  { reference: "Romans 12:12", text: "Be joyful in hope, patient in affliction, faithful in prayer.", book: "Romans", chapter: 12, verseStart: 12, verseEnd: 12 },
  { reference: "Psalm 95:1-2", text: "Come, let us sing for joy to the Lord; let us shout aloud to the Rock of our salvation. Let us come before him with thanksgiving and extol him with music and song.", book: "Psalms", chapter: 95, verseStart: 1, verseEnd: 2 },
  { reference: "Galatians 5:22", text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness.", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: 22 },
  { reference: "Psalm 107:1", text: "Give thanks to the Lord, for he is good; his love endures forever.", book: "Psalms", chapter: 107, verseStart: 1, verseEnd: 1 },
  { reference: "Habakkuk 3:18", text: "Yet I will rejoice in the Lord, I will be joyful in God my Savior.", book: "Habakkuk", chapter: 3, verseStart: 18, verseEnd: 18 },
  { reference: "Colossians 3:17", text: "And whatever you do, whether in word or deed, do it all in the name of the Lord Jesus, giving thanks to God the Father through him.", book: "Colossians", chapter: 3, verseStart: 17, verseEnd: 17 },
  { reference: "Psalm 66:1-2", text: "Shout for joy to God, all the earth! Sing the glory of his name; make his praise glorious.", book: "Psalms", chapter: 66, verseStart: 1, verseEnd: 2 },
  { reference: "2 Corinthians 9:15", text: "Thanks be to God for his indescribable gift!", book: "2 Corinthians", chapter: 9, verseStart: 15, verseEnd: 15 },
  { reference: "Psalm 32:11", text: "Rejoice in the Lord and be glad, you righteous; sing, all you who are upright in heart!", book: "Psalms", chapter: 32, verseStart: 11, verseEnd: 11 },
  { reference: "Isaiah 12:4-5", text: "In that day you will say: 'Give praise to the Lord, proclaim his name; make known among the nations what he has done, and proclaim that his name is exalted. Sing to the Lord, for he has done glorious things.'", book: "Isaiah", chapter: 12, verseStart: 4, verseEnd: 5 },
  { reference: "Psalm 9:2", text: "I will be glad and rejoice in you; I will sing the praises of your name, O Most High.", book: "Psalms", chapter: 9, verseStart: 2, verseEnd: 2 },
  { reference: "Ephesians 5:20", text: "Always giving thanks to God the Father for everything, in the name of our Lord Jesus Christ.", book: "Ephesians", chapter: 5, verseStart: 20, verseEnd: 20 },
  { reference: "Psalm 47:1", text: "Clap your hands, all you nations; shout to God with cries of joy.", book: "Psalms", chapter: 47, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 69:30", text: "I will praise God's name in song and glorify him with thanksgiving.", book: "Psalms", chapter: 69, verseStart: 30, verseEnd: 30 },
  { reference: "Zephaniah 3:17", text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", book: "Zephaniah", chapter: 3, verseStart: 17, verseEnd: 17 },
  { reference: "Psalm 98:4", text: "Shout for joy to the Lord, all the earth, burst into jubilant song with music.", book: "Psalms", chapter: 98, verseStart: 4, verseEnd: 4 },
  { reference: "1 Chronicles 16:34", text: "Give thanks to the Lord, for he is good; his love endures forever.", book: "1 Chronicles", chapter: 16, verseStart: 34, verseEnd: 34 },

  // PRAYER & DEVOTION (Days 241-270)
  { reference: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: 7 },
  { reference: "1 Thessalonians 5:17", text: "Pray continually.", book: "1 Thessalonians", chapter: 5, verseStart: 17, verseEnd: 17 },
  { reference: "Matthew 7:7-8", text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you. For everyone who asks receives; the one who seeks finds; and to the one who knocks, the door will be opened.", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: 8 },
  { reference: "Jeremiah 29:12", text: "Then you will call on me and come and pray to me, and I will listen to you.", book: "Jeremiah", chapter: 29, verseStart: 12, verseEnd: 12 },
  { reference: "James 5:16", text: "Therefore confess your sins to each other and pray for each other so that you may be healed. The prayer of a righteous person is powerful and effective.", book: "James", chapter: 5, verseStart: 16, verseEnd: 16 },
  { reference: "Psalm 145:18", text: "The Lord is near to all who call on him, to all who call on him in truth.", book: "Psalms", chapter: 145, verseStart: 18, verseEnd: 18 },
  { reference: "Mark 11:24", text: "Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours.", book: "Mark", chapter: 11, verseStart: 24, verseEnd: 24 },
  { reference: "Romans 8:26", text: "In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans.", book: "Romans", chapter: 8, verseStart: 26, verseEnd: 26 },
  { reference: "Psalm 17:6", text: "I call on you, my God, for you will answer me; turn your ear to me and hear my prayer.", book: "Psalms", chapter: 17, verseStart: 6, verseEnd: 6 },
  { reference: "1 John 5:14", text: "This is the confidence we have in approaching God: that if we ask anything according to his will, he hears us.", book: "1 John", chapter: 5, verseStart: 14, verseEnd: 14 },
  { reference: "Psalm 55:17", text: "Evening, morning and noon I cry out in distress, and he hears my voice.", book: "Psalms", chapter: 55, verseStart: 17, verseEnd: 17 },
  { reference: "Colossians 4:2", text: "Devote yourselves to prayer, being watchful and thankful.", book: "Colossians", chapter: 4, verseStart: 2, verseEnd: 2 },
  { reference: "Psalm 6:9", text: "The Lord has heard my cry for mercy; the Lord accepts my prayer.", book: "Psalms", chapter: 6, verseStart: 9, verseEnd: 9 },
  { reference: "Matthew 6:6", text: "But when you pray, go into your room, close the door and pray to your Father, who is unseen. Then your Father, who sees what is done in secret, will reward you.", book: "Matthew", chapter: 6, verseStart: 6, verseEnd: 6 },
  { reference: "Psalm 102:17", text: "He will respond to the prayer of the destitute; he will not despise their plea.", book: "Psalms", chapter: 102, verseStart: 17, verseEnd: 17 },
  { reference: "Ephesians 6:18", text: "And pray in the Spirit on all occasions with all kinds of prayers and requests. With this in mind, be alert and always keep on praying for all the Lord's people.", book: "Ephesians", chapter: 6, verseStart: 18, verseEnd: 18 },
  { reference: "Psalm 34:17", text: "The righteous cry out, and the Lord hears them; he delivers them from all their troubles.", book: "Psalms", chapter: 34, verseStart: 17, verseEnd: 17 },
  { reference: "John 14:13-14", text: "And I will do whatever you ask in my name, so that the Father may be glorified in the Son. You may ask me for anything in my name, and I will do it.", book: "John", chapter: 14, verseStart: 13, verseEnd: 14 },
  { reference: "Psalm 66:19-20", text: "But God has surely listened and has heard my prayer. Praise be to God, who has not rejected my prayer or withheld his love from me!", book: "Psalms", chapter: 66, verseStart: 19, verseEnd: 20 },
  { reference: "Luke 18:1", text: "Then Jesus told his disciples a parable to show them that they should always pray and not give up.", book: "Luke", chapter: 18, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 4:1", text: "Answer me when I call to you, my righteous God. Give me relief from my distress; have mercy on me and hear my prayer.", book: "Psalms", chapter: 4, verseStart: 1, verseEnd: 1 },
  { reference: "1 Timothy 2:1", text: "I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people.", book: "1 Timothy", chapter: 2, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 86:6-7", text: "Hear my prayer, Lord; listen to my cry for mercy. When I am in distress, I call to you, because you answer me.", book: "Psalms", chapter: 86, verseStart: 6, verseEnd: 7 },
  { reference: "Matthew 18:19-20", text: "Again, truly I tell you that if two of you on earth agree about anything they ask for, it will be done for them by my Father in heaven. For where two or three gather in my name, there am I with them.", book: "Matthew", chapter: 18, verseStart: 19, verseEnd: 20 },
  { reference: "Psalm 91:15", text: "He will call on me, and I will answer him; I will be with him in trouble, I will deliver him and honor him.", book: "Psalms", chapter: 91, verseStart: 15, verseEnd: 15 },
  { reference: "Hebrews 4:16", text: "Let us then approach God's throne of grace with confidence, so that we may receive mercy and find grace to help us in our time of need.", book: "Hebrews", chapter: 4, verseStart: 16, verseEnd: 16 },
  { reference: "Psalm 65:2", text: "You who answer prayer, to you all people will come.", book: "Psalms", chapter: 65, verseStart: 2, verseEnd: 2 },
  { reference: "James 4:8", text: "Come near to God and he will come near to you.", book: "James", chapter: 4, verseStart: 8, verseEnd: 8 },
  { reference: "Psalm 5:3", text: "In the morning, Lord, you hear my voice; in the morning I lay my requests before you and wait expectantly.", book: "Psalms", chapter: 5, verseStart: 3, verseEnd: 3 },
  { reference: "Romans 12:12", text: "Be joyful in hope, patient in affliction, faithful in prayer.", book: "Romans", chapter: 12, verseStart: 12, verseEnd: 12 },

  // PROVISION & PROTECTION (Days 271-300)
  { reference: "Psalm 23:1-4", text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul. He guides me along the right paths for his name's sake. Even though I walk through the darkest valley, I will fear no evil, for you are with me.", book: "Psalms", chapter: 23, verseStart: 1, verseEnd: 4 },
  { reference: "Matthew 6:31-33", text: "So do not worry, saying, 'What shall we eat?' or 'What shall we drink?' or 'What shall we wear?' For the pagans run after all these things, and your heavenly Father knows that you need them. But seek first his kingdom and his righteousness, and all these things will be given to you as well.", book: "Matthew", chapter: 6, verseStart: 31, verseEnd: 33 },
  { reference: "Philippians 4:19", text: "And my God will meet all your needs according to the riches of his glory in Christ Jesus.", book: "Philippians", chapter: 4, verseStart: 19, verseEnd: 19 },
  { reference: "Psalm 91:1-2", text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, 'He is my refuge and my fortress, my God, in whom I trust.'", book: "Psalms", chapter: 91, verseStart: 1, verseEnd: 2 },
  { reference: "Deuteronomy 31:8", text: "The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged.", book: "Deuteronomy", chapter: 31, verseStart: 8, verseEnd: 8 },
  { reference: "Psalm 34:7", text: "The angel of the Lord encamps around those who fear him, and he delivers them.", book: "Psalms", chapter: 34, verseStart: 7, verseEnd: 7 },
  { reference: "2 Thessalonians 3:3", text: "But the Lord is faithful, and he will strengthen you and protect you from the evil one.", book: "2 Thessalonians", chapter: 3, verseStart: 3, verseEnd: 3 },
  { reference: "Psalm 121:7-8", text: "The Lord will keep you from all harm—he will watch over your life; the Lord will watch over your coming and going both now and forevermore.", book: "Psalms", chapter: 121, verseStart: 7, verseEnd: 8 },
  { reference: "Isaiah 58:11", text: "The Lord will guide you always; he will satisfy your needs in a sun-scorched land and will strengthen your frame.", book: "Isaiah", chapter: 58, verseStart: 11, verseEnd: 11 },
  { reference: "Psalm 18:2", text: "The Lord is my rock, my fortress and my deliverer; my God is my rock, in whom I take refuge, my shield and the horn of my salvation, my stronghold.", book: "Psalms", chapter: 18, verseStart: 2, verseEnd: 2 },
  { reference: "2 Samuel 22:31", text: "As for God, his way is perfect: The Lord's word is flawless; he shields all who take refuge in him.", book: "2 Samuel", chapter: 22, verseStart: 31, verseEnd: 31 },
  { reference: "Psalm 37:25", text: "I was young and now I am old, yet I have never seen the righteous forsaken or their children begging bread.", book: "Psalms", chapter: 37, verseStart: 25, verseEnd: 25 },
  { reference: "Isaiah 43:2", text: "When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you.", book: "Isaiah", chapter: 43, verseStart: 2, verseEnd: 2 },
  { reference: "Psalm 46:1", text: "God is our refuge and strength, an ever-present help in trouble.", book: "Psalms", chapter: 46, verseStart: 1, verseEnd: 1 },
  { reference: "Proverbs 18:10", text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", book: "Proverbs", chapter: 18, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 145:15-16", text: "The eyes of all look to you, and you give them their food at the proper time. You open your hand and satisfy the desires of every living thing.", book: "Psalms", chapter: 145, verseStart: 15, verseEnd: 16 },
  { reference: "Nahum 1:7", text: "The Lord is good, a refuge in times of trouble. He cares for those who trust in him.", book: "Nahum", chapter: 1, verseStart: 7, verseEnd: 7 },
  { reference: "Psalm 34:10", text: "The lions may grow weak and hungry, but those who seek the Lord lack no good thing.", book: "Psalms", chapter: 34, verseStart: 10, verseEnd: 10 },
  { reference: "Luke 12:24", text: "Consider the ravens: They do not sow or reap, they have no storeroom or barn; yet God feeds them. And how much more valuable you are than birds!", book: "Luke", chapter: 12, verseStart: 24, verseEnd: 24 },
  { reference: "Psalm 59:16", text: "But I will sing of your strength, in the morning I will sing of your love; for you are my fortress, my refuge in times of trouble.", book: "Psalms", chapter: 59, verseStart: 16, verseEnd: 16 },
  { reference: "Psalm 111:5", text: "He provides food for those who fear him; he remembers his covenant forever.", book: "Psalms", chapter: 111, verseStart: 5, verseEnd: 5 },
  { reference: "Isaiah 41:13", text: "For I am the Lord your God who takes hold of your right hand and says to you, Do not fear; I will help you.", book: "Isaiah", chapter: 41, verseStart: 13, verseEnd: 13 },
  { reference: "Psalm 147:3", text: "He heals the brokenhearted and binds up their wounds.", book: "Psalms", chapter: 147, verseStart: 3, verseEnd: 3 },
  { reference: "Matthew 7:11", text: "If you, then, though you are evil, know how to give good gifts to your children, how much more will your Father in heaven give good gifts to those who ask him!", book: "Matthew", chapter: 7, verseStart: 11, verseEnd: 11 },
  { reference: "Psalm 32:7", text: "You are my hiding place; you will protect me from trouble and surround me with songs of deliverance.", book: "Psalms", chapter: 32, verseStart: 7, verseEnd: 7 },
  { reference: "2 Corinthians 9:8", text: "And God is able to bless you abundantly, so that in all things at all times, having all that you need, you will abound in every good work.", book: "2 Corinthians", chapter: 9, verseStart: 8, verseEnd: 8 },
  { reference: "Psalm 5:11-12", text: "But let all who take refuge in you be glad; let them ever sing for joy. Spread your protection over them, that those who love your name may rejoice in you.", book: "Psalms", chapter: 5, verseStart: 11, verseEnd: 12 },
  { reference: "Romans 8:32", text: "He who did not spare his own Son, but gave him up for us all—how will he not also, along with him, graciously give us all things?", book: "Romans", chapter: 8, verseStart: 32, verseEnd: 32 },
  { reference: "Psalm 4:8", text: "In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.", book: "Psalms", chapter: 4, verseStart: 8, verseEnd: 8 },
  { reference: "Genesis 28:15", text: "I am with you and will watch over you wherever you go, and I will bring you back to this land. I will not leave you until I have done what I have promised you.", book: "Genesis", chapter: 28, verseStart: 15, verseEnd: 15 },

  // PURPOSE & CALLING (Days 301-330)
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: 11 },
  { reference: "Ephesians 2:10", text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.", book: "Ephesians", chapter: 2, verseStart: 10, verseEnd: 10 },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", book: "Romans", chapter: 8, verseStart: 28, verseEnd: 28 },
  { reference: "1 Peter 2:9", text: "But you are a chosen people, a royal priesthood, a holy nation, God's special possession, that you may declare the praises of him who called you out of darkness into his wonderful light.", book: "1 Peter", chapter: 2, verseStart: 9, verseEnd: 9 },
  { reference: "Proverbs 19:21", text: "Many are the plans in a person's heart, but it is the Lord's purpose that prevails.", book: "Proverbs", chapter: 19, verseStart: 21, verseEnd: 21 },
  { reference: "2 Timothy 1:9", text: "He has saved us and called us to a holy life—not because of anything we have done but because of his own purpose and grace.", book: "2 Timothy", chapter: 1, verseStart: 9, verseEnd: 9 },
  { reference: "Psalm 138:8", text: "The Lord will vindicate me; your love, Lord, endures forever—do not abandon the works of your hands.", book: "Psalms", chapter: 138, verseStart: 8, verseEnd: 8 },
  { reference: "Isaiah 43:7", text: "Everyone who is called by my name, whom I created for my glory, whom I formed and made.", book: "Isaiah", chapter: 43, verseStart: 7, verseEnd: 7 },
  { reference: "Philippians 1:6", text: "Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus.", book: "Philippians", chapter: 1, verseStart: 6, verseEnd: 6 },
  { reference: "Psalm 57:2", text: "I cry out to God Most High, to God, who vindicates me.", book: "Psalms", chapter: 57, verseStart: 2, verseEnd: 2 },
  { reference: "Colossians 3:23-24", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters, since you know that you will receive an inheritance from the Lord as a reward.", book: "Colossians", chapter: 3, verseStart: 23, verseEnd: 24 },
  { reference: "Psalm 139:13-14", text: "For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made.", book: "Psalms", chapter: 139, verseStart: 13, verseEnd: 14 },
  { reference: "Matthew 5:14-16", text: "You are the light of the world. A town built on a hill cannot be hidden. Neither do people light a lamp and put it under a bowl. Instead they put it on its stand, and it gives light to everyone in the house. In the same way, let your light shine before others.", book: "Matthew", chapter: 5, verseStart: 14, verseEnd: 16 },
  { reference: "Psalm 33:11", text: "But the plans of the Lord stand firm forever, the purposes of his heart through all generations.", book: "Psalms", chapter: 33, verseStart: 11, verseEnd: 11 },
  { reference: "1 Corinthians 12:27", text: "Now you are the body of Christ, and each one of you is a part of it.", book: "1 Corinthians", chapter: 12, verseStart: 27, verseEnd: 27 },
  { reference: "Esther 4:14", text: "And who knows but that you have come to your royal position for such a time as this?", book: "Esther", chapter: 4, verseStart: 14, verseEnd: 14 },
  { reference: "Galatians 1:15", text: "But when God, who set me apart from my mother's womb and called me by his grace, was pleased.", book: "Galatians", chapter: 1, verseStart: 15, verseEnd: 15 },
  { reference: "Psalm 40:5", text: "Many, Lord my God, are the wonders you have done, the things you planned for us. None can compare with you; were I to speak and tell of your deeds, they would be too many to declare.", book: "Psalms", chapter: 40, verseStart: 5, verseEnd: 5 },
  { reference: "Mark 16:15", text: "He said to them, 'Go into all the world and preach the gospel to all creation.'", book: "Mark", chapter: 16, verseStart: 15, verseEnd: 15 },
  { reference: "Psalm 139:16", text: "Your eyes saw my unformed body; all the days ordained for me were written in your book before one of them came to be.", book: "Psalms", chapter: 139, verseStart: 16, verseEnd: 16 },
  { reference: "1 Corinthians 10:31", text: "So whether you eat or drink or whatever you do, do it all for the glory of God.", book: "1 Corinthians", chapter: 10, verseStart: 31, verseEnd: 31 },
  { reference: "Isaiah 6:8", text: "Then I heard the voice of the Lord saying, 'Whom shall I send? And who will go for us?' And I said, 'Here am I. Send me!'", book: "Isaiah", chapter: 6, verseStart: 8, verseEnd: 8 },
  { reference: "Romans 12:6-8", text: "We have different gifts, according to the grace given to each of us. If your gift is prophesying, then prophesy in accordance with your faith; if it is serving, then serve; if it is teaching, then teach; if it is to encourage, then give encouragement.", book: "Romans", chapter: 12, verseStart: 6, verseEnd: 8 },
  { reference: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart.", book: "Psalms", chapter: 37, verseStart: 4, verseEnd: 4 },
  { reference: "John 15:16", text: "You did not choose me, but I chose you and appointed you so that you might go and bear fruit—fruit that will last.", book: "John", chapter: 15, verseStart: 16, verseEnd: 16 },
  { reference: "Micah 6:8", text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.", book: "Micah", chapter: 6, verseStart: 8, verseEnd: 8 },
  { reference: "Ephesians 4:1", text: "As a prisoner for the Lord, then, I urge you to live a life worthy of the calling you have received.", book: "Ephesians", chapter: 4, verseStart: 1, verseEnd: 1 },
  { reference: "Psalm 143:10", text: "Teach me to do your will, for you are my God; may your good Spirit lead me on level ground.", book: "Psalms", chapter: 143, verseStart: 10, verseEnd: 10 },
  { reference: "Acts 20:24", text: "However, I consider my life worth nothing to me; my only aim is to finish the race and complete the task the Lord Jesus has given me.", book: "Acts", chapter: 20, verseStart: 24, verseEnd: 24 },
  { reference: "Philippians 2:13", text: "For it is God who works in you to will and to act in order to fulfill his good purpose.", book: "Philippians", chapter: 2, verseStart: 13, verseEnd: 13 },

  // PERSEVERANCE & ENDURANCE (Days 331-365)
  { reference: "James 1:12", text: "Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life that the Lord has promised to those who love him.", book: "James", chapter: 1, verseStart: 12, verseEnd: 12 },
  { reference: "Galatians 6:9", text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", book: "Galatians", chapter: 6, verseStart: 9, verseEnd: 9 },
  { reference: "Hebrews 12:1-2", text: "Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.", book: "Hebrews", chapter: 12, verseStart: 1, verseEnd: 2 },
  { reference: "Romans 5:3-4", text: "Not only so, but we also glory in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope.", book: "Romans", chapter: 5, verseStart: 3, verseEnd: 4 },
  { reference: "1 Corinthians 15:58", text: "Therefore, my dear brothers and sisters, stand firm. Let nothing move you. Always give yourselves fully to the work of the Lord, because you know that your labor in the Lord is not in vain.", book: "1 Corinthians", chapter: 15, verseStart: 58, verseEnd: 58 },
  { reference: "2 Corinthians 4:16-17", text: "Therefore we do not lose heart. Though outwardly we are wasting away, yet inwardly we are being renewed day by day. For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all.", book: "2 Corinthians", chapter: 4, verseStart: 16, verseEnd: 17 },
  { reference: "Philippians 3:14", text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.", book: "Philippians", chapter: 3, verseStart: 14, verseEnd: 14 },
  { reference: "1 Peter 5:10", text: "And the God of all grace, who called you to his eternal glory in Christ, after you have suffered a little while, will himself restore you and make you strong, firm and steadfast.", book: "1 Peter", chapter: 5, verseStart: 10, verseEnd: 10 },
  { reference: "2 Timothy 4:7", text: "I have fought the good fight, I have finished the race, I have kept the faith.", book: "2 Timothy", chapter: 4, verseStart: 7, verseEnd: 7 },
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: 31 },
  { reference: "Hebrews 10:36", text: "You need to persevere so that when you have done the will of God, you will receive what he has promised.", book: "Hebrews", chapter: 10, verseStart: 36, verseEnd: 36 },
  { reference: "James 1:2-4", text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance. Let perseverance finish its work so that you may be mature and complete.", book: "James", chapter: 1, verseStart: 2, verseEnd: 4 },
  { reference: "Romans 12:12", text: "Be joyful in hope, patient in affliction, faithful in prayer.", book: "Romans", chapter: 12, verseStart: 12, verseEnd: 12 },
  { reference: "2 Thessalonians 3:5", text: "May the Lord direct your hearts into God's love and Christ's perseverance.", book: "2 Thessalonians", chapter: 3, verseStart: 5, verseEnd: 5 },
  { reference: "Revelation 2:10", text: "Do not be afraid of what you are about to suffer. Be faithful, even to the point of death, and I will give you life as your victor's crown.", book: "Revelation", chapter: 2, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 27:14", text: "Wait for the Lord; be strong and take heart and wait for the Lord.", book: "Psalms", chapter: 27, verseStart: 14, verseEnd: 14 },
  { reference: "1 Corinthians 9:24", text: "Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.", book: "1 Corinthians", chapter: 9, verseStart: 24, verseEnd: 24 },
  { reference: "Colossians 1:11", text: "Being strengthened with all power according to his glorious might so that you may have great endurance and patience.", book: "Colossians", chapter: 1, verseStart: 11, verseEnd: 11 },
  { reference: "Hebrews 6:12", text: "We do not want you to become lazy, but to imitate those who through faith and patience inherit what has been promised.", book: "Hebrews", chapter: 6, verseStart: 12, verseEnd: 12 },
  { reference: "2 Peter 1:5-6", text: "For this very reason, make every effort to add to your faith goodness; and to goodness, knowledge; and to knowledge, self-control; and to self-control, perseverance.", book: "2 Peter", chapter: 1, verseStart: 5, verseEnd: 6 },
  { reference: "Revelation 3:10", text: "Since you have kept my command to endure patiently, I will also keep you from the hour of trial that is going to come on the whole world.", book: "Revelation", chapter: 3, verseStart: 10, verseEnd: 10 },
  { reference: "Psalm 37:7", text: "Be still before the Lord and wait patiently for him; do not fret when people succeed in their ways, when they carry out their wicked schemes.", book: "Psalms", chapter: 37, verseStart: 7, verseEnd: 7 },
  { reference: "Romans 8:25", text: "But if we hope for what we do not yet have, we wait for it patiently.", book: "Romans", chapter: 8, verseStart: 25, verseEnd: 25 },
  { reference: "Hebrews 10:23", text: "Let us hold unswervingly to the hope we profess, for he who promised is faithful.", book: "Hebrews", chapter: 10, verseStart: 23, verseEnd: 23 },
  { reference: "James 5:11", text: "As you know, we count as blessed those who have persevered. You have heard of Job's perseverance and have seen what the Lord finally brought about. The Lord is full of compassion and mercy.", book: "James", chapter: 5, verseStart: 11, verseEnd: 11 },
  { reference: "1 Timothy 6:12", text: "Fight the good fight of the faith. Take hold of the eternal life to which you were called when you made your good confession in the presence of many witnesses.", book: "1 Timothy", chapter: 6, verseStart: 12, verseEnd: 12 },
  { reference: "Psalm 40:1", text: "I waited patiently for the Lord; he turned to me and heard my cry.", book: "Psalms", chapter: 40, verseStart: 1, verseEnd: 1 },
  { reference: "Revelation 14:12", text: "This calls for patient endurance on the part of the people of God who keep his commands and remain faithful to Jesus.", book: "Revelation", chapter: 14, verseStart: 12, verseEnd: 12 },
  { reference: "1 Peter 1:6-7", text: "In all this you greatly rejoice, though now for a little while you may have had to suffer grief in all kinds of trials. These have come so that the proven genuineness of your faith—of greater worth than gold, which perishes even though refined by fire—may result in praise.", book: "1 Peter", chapter: 1, verseStart: 6, verseEnd: 7 },
  { reference: "Hebrews 12:11", text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it.", book: "Hebrews", chapter: 12, verseStart: 11, verseEnd: 11 },
  { reference: "Romans 15:4", text: "For everything that was written in the past was written to teach us, so that through the endurance taught in the Scriptures and the encouragement they provide we might have hope.", book: "Romans", chapter: 15, verseStart: 4, verseEnd: 4 },
  { reference: "Psalm 130:5-6", text: "I wait for the Lord, my whole being waits, and in his word I put my hope. I wait for the Lord more than watchmen wait for the morning.", book: "Psalms", chapter: 130, verseStart: 5, verseEnd: 6 },
  { reference: "2 Corinthians 4:8-9", text: "We are hard pressed on every side, but not crushed; perplexed, but not in despair; persecuted, but not abandoned; struck down, but not destroyed.", book: "2 Corinthians", chapter: 4, verseStart: 8, verseEnd: 9 },
  { reference: "Matthew 24:13", text: "But the one who stands firm to the end will be saved.", book: "Matthew", chapter: 24, verseStart: 13, verseEnd: 13 },
  { reference: "Psalm 46:10", text: "He says, 'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.'", book: "Psalms", chapter: 46, verseStart: 10, verseEnd: 10 },
];

export class FaithManager {
  private containerName = "Main-PersonalSpace";
  private cosmos: CosmosDataSource;

  constructor(cosmos: CosmosDataSource) {
    this.cosmos = cosmos;
  }

  // ============================================
  // Daily Passage Queries & Mutations
  // ============================================

  async getTodaysPassage(userId: string): Promise<daily_passage_type | null> {
    const today = DateTime.now().toISODate()!;

    // Check if user already has today's passage
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.date = @date",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "DAILY_PASSAGE" },
        { name: "@date", value: today }
      ]
    };

    const results = await this.cosmos.run_query<daily_passage_type>(this.containerName, querySpec);
    if (results.length > 0) {
      return results[0];
    }

    // Generate a new daily passage for today
    return await this.generateDailyPassage(userId, today);
  }

  private async generateDailyPassage(userId: string, date: string): Promise<daily_passage_type> {
    // Use date-based index to get a consistent passage for the day
    const dayOfYear = DateTime.fromISO(date).ordinal;
    const passageIndex = dayOfYear % DAILY_PASSAGES.length;
    const passage = DAILY_PASSAGES[passageIndex];

    const id = uuid();
    const now = DateTime.now().toISO()!;

    const entry: Omit<daily_passage_type, '_id'> = {
      id,
      userId,
      docType: 'DAILY_PASSAGE',
      date,
      reference: passage.reference,
      text: passage.text,
      book: passage.book,
      chapter: passage.chapter,
      verseStart: passage.verseStart,
      verseEnd: passage.verseEnd,
      version: 'NIV',
      isRead: false,
      isReflected: false,
      createdAt: now,
      updatedAt: now
    };

    return await this.cosmos.add_record<daily_passage_type>(
      this.containerName,
      entry,
      userId,
      userId
    );
  }

  async getDailyPassages(userId: string, filters?: daily_passage_filters): Promise<daily_passage_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "DAILY_PASSAGE" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.isRead !== undefined) {
      query += " AND c.isRead = @isRead";
      parameters.push({ name: "@isRead", value: filters.isRead });
    }

    if (filters?.isReflected !== undefined) {
      query += " AND c.isReflected = @isReflected";
      parameters.push({ name: "@isReflected", value: filters.isReflected });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<daily_passage_type>(this.containerName, querySpec);
  }

  async getDailyPassage(id: string, userId: string): Promise<daily_passage_type | null> {
    return await this.cosmos.get_record_by_doctype<daily_passage_type>(
      this.containerName,
      id,
      userId,
      "DAILY_PASSAGE"
    );
  }

  async markPassageRead(id: string, userId: string, authenticatedUserId: string): Promise<daily_passage_response> {
    const existing = await this.getDailyPassage(id, userId);
    if (!existing) {
      return { success: false, message: "Passage not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own passages" };
    }

    const now = DateTime.now().toISO()!;
    const updates: Partial<daily_passage_type> = {
      isRead: true,
      readAt: now,
      updatedAt: now
    };

    await this.cosmos.update_record(this.containerName, id, userId, updates, authenticatedUserId);

    const updated = await this.getDailyPassage(id, userId);
    return { success: true, message: "Passage marked as read", passage: updated! };
  }

  async reflectOnPassage(input: reflect_on_passage_input, authenticatedUserId: string): Promise<daily_passage_response> {
    const existing = await this.getDailyPassage(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Passage not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own passages" };
    }

    const now = DateTime.now().toISO()!;
    const updates: Partial<daily_passage_type> = {
      isRead: true,
      readAt: existing.readAt || now,
      isReflected: true,
      reflectedAt: now,
      updatedAt: now
    };

    if (input.reflection !== undefined) updates.reflection = input.reflection;
    if (input.prayerResponse !== undefined) updates.prayerResponse = input.prayerResponse;
    if (input.personalApplication !== undefined) updates.personalApplication = input.personalApplication;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getDailyPassage(input.id, input.userId);
    return { success: true, message: "Reflection saved", passage: updated! };
  }

  // ============================================
  // Prayer Journal Queries & Mutations
  // ============================================

  async getPrayerJournalEntries(userId: string, filters?: prayer_journal_filters): Promise<prayer_journal_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "PRAYER_JOURNAL" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.prayerType) {
      query += " AND c.prayerType = @prayerType";
      parameters.push({ name: "@prayerType", value: filters.prayerType });
    }

    if (filters?.status) {
      query += " AND c.status = @status";
      parameters.push({ name: "@status", value: filters.status });
    }

    if (filters?.tag) {
      query += " AND ARRAY_CONTAINS(c.tags, @tag)";
      parameters.push({ name: "@tag", value: filters.tag });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<prayer_journal_type>(this.containerName, querySpec);
  }

  async getPrayerJournalEntry(id: string, userId: string): Promise<prayer_journal_type | null> {
    return await this.cosmos.get_record_by_doctype<prayer_journal_type>(
      this.containerName,
      id,
      userId,
      "PRAYER_JOURNAL"
    );
  }

  async getRecentPrayers(userId: string, limit: number = 5): Promise<prayer_journal_type[]> {
    return this.getPrayerJournalEntries(userId, { limit });
  }

  async getAnsweredPrayers(userId: string, limit: number = 10): Promise<prayer_journal_type[]> {
    const querySpec = {
      query: `SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType
              AND (c.status = @answered OR c.status = @answeredDiff)
              ORDER BY c.answeredDate DESC OFFSET 0 LIMIT @limit`,
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "PRAYER_JOURNAL" },
        { name: "@answered", value: "answered" },
        { name: "@answeredDiff", value: "answered_differently" },
        { name: "@limit", value: limit }
      ]
    };
    return await this.cosmos.run_query<prayer_journal_type>(this.containerName, querySpec);
  }

  async getPrayerRequests(userId: string, status?: prayer_status): Promise<prayer_journal_type[]> {
    let query = `SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType
                 AND (c.prayerType = @petition OR c.prayerType = @intercession)`;
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "PRAYER_JOURNAL" },
      { name: "@petition", value: "petition" },
      { name: "@intercession", value: "intercession" }
    ];

    if (status) {
      query += " AND c.status = @status";
      parameters.push({ name: "@status", value: status });
    }

    query += " ORDER BY c.date DESC";
    const querySpec = { query, parameters };
    return await this.cosmos.run_query<prayer_journal_type>(this.containerName, querySpec);
  }

  async createPrayerJournalEntry(input: create_prayer_journal_input, authenticatedUserId: string): Promise<prayer_journal_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only create prayers for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const date = input.date || DateTime.now().toISODate()!;

    const entry: Omit<prayer_journal_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'PRAYER_JOURNAL',
      date,
      title: input.title,
      prayerType: input.prayerType,
      content: input.content,
      status: input.status || 'active',
      prayingFor: input.prayingFor,
      requests: input.requests,
      gratitude: input.gratitude,
      scriptureReference: input.scriptureReference,
      scriptureText: input.scriptureText,
      insights: input.insights,
      feelingBefore: input.feelingBefore,
      feelingAfter: input.feelingAfter,
      tags: input.tags,
      isPrivate: input.isPrivate !== false, // Default to true
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<prayer_journal_type>(
      this.containerName,
      entry,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Prayer journal entry created", prayer: created };
  }

  async updatePrayerJournalEntry(input: update_prayer_journal_input, authenticatedUserId: string): Promise<prayer_journal_response> {
    const existing = await this.getPrayerJournalEntry(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Prayer not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own prayers" };
    }

    const updates: Partial<prayer_journal_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.prayerType !== undefined) updates.prayerType = input.prayerType;
    if (input.content !== undefined) updates.content = input.content;
    if (input.status !== undefined) updates.status = input.status;
    if (input.prayingFor !== undefined) updates.prayingFor = input.prayingFor;
    if (input.requests !== undefined) updates.requests = input.requests;
    if (input.gratitude !== undefined) updates.gratitude = input.gratitude;
    if (input.scriptureReference !== undefined) updates.scriptureReference = input.scriptureReference;
    if (input.scriptureText !== undefined) updates.scriptureText = input.scriptureText;
    if (input.insights !== undefined) updates.insights = input.insights;
    if (input.feelingBefore !== undefined) updates.feelingBefore = input.feelingBefore;
    if (input.feelingAfter !== undefined) updates.feelingAfter = input.feelingAfter;
    if (input.answeredDate !== undefined) updates.answeredDate = input.answeredDate;
    if (input.answerDescription !== undefined) updates.answerDescription = input.answerDescription;
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.isPrivate !== undefined) updates.isPrivate = input.isPrivate;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getPrayerJournalEntry(input.id, input.userId);
    return { success: true, message: "Prayer updated", prayer: updated! };
  }

  async markPrayerAnswered(
    id: string,
    userId: string,
    authenticatedUserId: string,
    answeredDate?: string,
    answerDescription?: string
  ): Promise<prayer_journal_response> {
    const existing = await this.getPrayerJournalEntry(id, userId);
    if (!existing) {
      return { success: false, message: "Prayer not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own prayers" };
    }

    const updates: Partial<prayer_journal_type> = {
      status: 'answered',
      answeredDate: answeredDate || DateTime.now().toISODate()!,
      answerDescription,
      updatedAt: DateTime.now().toISO()!
    };

    await this.cosmos.update_record(this.containerName, id, userId, updates, authenticatedUserId);

    const updated = await this.getPrayerJournalEntry(id, userId);
    return { success: true, message: "Prayer marked as answered", prayer: updated! };
  }

  async deletePrayerJournalEntry(id: string, userId: string, authenticatedUserId: string): Promise<delete_faith_response> {
    const existing = await this.getPrayerJournalEntry(id, userId);
    if (!existing) {
      return { success: false, message: "Prayer not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own prayers" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Prayer deleted" };
  }

  // ============================================
  // Scripture Reflection Queries & Mutations
  // ============================================

  async getScriptureReflections(userId: string, filters?: scripture_reflection_filters): Promise<scripture_reflection_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "SCRIPTURE_REFLECTION" }
    ];

    if (filters?.startDate) {
      query += " AND c.date >= @startDate";
      parameters.push({ name: "@startDate", value: filters.startDate });
    }

    if (filters?.endDate) {
      query += " AND c.date <= @endDate";
      parameters.push({ name: "@endDate", value: filters.endDate });
    }

    if (filters?.book) {
      query += " AND c.book = @book";
      parameters.push({ name: "@book", value: filters.book });
    }

    if (filters?.bookType) {
      query += " AND c.bookType = @bookType";
      parameters.push({ name: "@bookType", value: filters.bookType });
    }

    query += " ORDER BY c.date DESC";

    if (filters?.limit) {
      query += ` OFFSET ${filters.offset || 0} LIMIT ${filters.limit}`;
    }

    const querySpec = { query, parameters };
    return await this.cosmos.run_query<scripture_reflection_type>(this.containerName, querySpec);
  }

  async getScriptureReflection(id: string, userId: string): Promise<scripture_reflection_type | null> {
    return await this.cosmos.get_record_by_doctype<scripture_reflection_type>(
      this.containerName,
      id,
      userId,
      "SCRIPTURE_REFLECTION"
    );
  }

  async getRecentScriptureReflections(userId: string, limit: number = 5): Promise<scripture_reflection_type[]> {
    return this.getScriptureReflections(userId, { limit });
  }

  async getScriptureByBook(userId: string, book: string, limit: number = 20): Promise<scripture_reflection_type[]> {
    return this.getScriptureReflections(userId, { book, limit });
  }

  async createScriptureReflection(input: create_scripture_reflection_input, authenticatedUserId: string): Promise<scripture_reflection_response> {
    if (input.userId !== authenticatedUserId) {
      return { success: false, message: "You can only create reflections for yourself" };
    }

    const id = uuid();
    const now = DateTime.now().toISO()!;
    const date = input.date || DateTime.now().toISODate()!;

    const entry: Omit<scripture_reflection_type, '_id'> = {
      id,
      userId: input.userId,
      docType: 'SCRIPTURE_REFLECTION',
      date,
      reference: input.reference,
      book: input.book,
      chapter: input.chapter,
      verseStart: input.verseStart,
      verseEnd: input.verseEnd,
      bookType: input.bookType,
      text: input.text,
      whatSpokeToMe: input.whatSpokeToMe,
      personalApplication: input.personalApplication,
      questions: input.questions,
      crossReferences: input.crossReferences,
      readingContext: input.readingContext,
      version: input.version,
      prayerResponse: input.prayerResponse,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.cosmos.add_record<scripture_reflection_type>(
      this.containerName,
      entry,
      input.userId,
      authenticatedUserId
    );

    return { success: true, message: "Scripture reflection created", reflection: created };
  }

  async updateScriptureReflection(input: update_scripture_reflection_input, authenticatedUserId: string): Promise<scripture_reflection_response> {
    const existing = await this.getScriptureReflection(input.id, input.userId);
    if (!existing) {
      return { success: false, message: "Reflection not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only update your own reflections" };
    }

    const updates: Partial<scripture_reflection_type> = {
      updatedAt: DateTime.now().toISO()!
    };

    if (input.reference !== undefined) updates.reference = input.reference;
    if (input.book !== undefined) updates.book = input.book;
    if (input.chapter !== undefined) updates.chapter = input.chapter;
    if (input.verseStart !== undefined) updates.verseStart = input.verseStart;
    if (input.verseEnd !== undefined) updates.verseEnd = input.verseEnd;
    if (input.bookType !== undefined) updates.bookType = input.bookType;
    if (input.text !== undefined) updates.text = input.text;
    if (input.whatSpokeToMe !== undefined) updates.whatSpokeToMe = input.whatSpokeToMe;
    if (input.personalApplication !== undefined) updates.personalApplication = input.personalApplication;
    if (input.questions !== undefined) updates.questions = input.questions;
    if (input.crossReferences !== undefined) updates.crossReferences = input.crossReferences;
    if (input.readingContext !== undefined) updates.readingContext = input.readingContext;
    if (input.version !== undefined) updates.version = input.version;
    if (input.prayerResponse !== undefined) updates.prayerResponse = input.prayerResponse;

    await this.cosmos.update_record(this.containerName, input.id, input.userId, updates, authenticatedUserId);

    const updated = await this.getScriptureReflection(input.id, input.userId);
    return { success: true, message: "Reflection updated", reflection: updated! };
  }

  async deleteScriptureReflection(id: string, userId: string, authenticatedUserId: string): Promise<delete_faith_response> {
    const existing = await this.getScriptureReflection(id, userId);
    if (!existing) {
      return { success: false, message: "Reflection not found" };
    }

    if (existing.userId !== authenticatedUserId) {
      return { success: false, message: "You can only delete your own reflections" };
    }

    await this.cosmos.delete_record(this.containerName, id, userId, authenticatedUserId);
    return { success: true, message: "Reflection deleted" };
  }

  // ============================================
  // Faith Statistics
  // ============================================

  async getFaithStats(userId: string): Promise<faith_stats> {
    // Get all faith data
    const passages = await this.getDailyPassages(userId, { limit: 365 });
    const prayers = await this.getPrayerJournalEntries(userId, { limit: 500 });
    const scriptures = await this.getScriptureReflections(userId, { limit: 500 });

    // Time calculations
    const now = DateTime.now();
    const weekAgo = now.minus({ weeks: 1 });
    const monthAgo = now.minus({ months: 1 });

    // Daily Passage stats
    let totalPassagesRead = 0;
    let totalPassagesReflected = 0;
    let passagesThisWeek = 0;

    for (const passage of passages) {
      if (passage.isRead) totalPassagesRead++;
      if (passage.isReflected) totalPassagesReflected++;
      const passageDate = DateTime.fromISO(passage.date);
      if (passageDate >= weekAgo) passagesThisWeek++;
    }

    // Calculate daily passage streak
    let dailyPassageStreak = 0;
    if (passages.length > 0) {
      const readDates = passages
        .filter(p => p.isRead)
        .map(p => p.date)
        .sort()
        .reverse();
      const uniqueDates = [...new Set(readDates)];
      const today = DateTime.now().toISODate()!;
      const yesterday = DateTime.now().minus({ days: 1 }).toISODate()!;

      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        dailyPassageStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const curr = DateTime.fromISO(uniqueDates[i]);
          const prev = DateTime.fromISO(uniqueDates[i - 1]);
          if (Math.floor(prev.diff(curr, 'days').days) === 1) {
            dailyPassageStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Prayer stats
    let prayersThisWeek = 0;
    let prayersThisMonth = 0;
    let answeredPrayersCount = 0;
    let waitingPrayersCount = 0;
    let activePrayersCount = 0;
    const prayerTypeCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    const bookCounts: Record<string, number> = {};

    for (const prayer of prayers) {
      const prayerDate = DateTime.fromISO(prayer.date);
      if (prayerDate >= weekAgo) prayersThisWeek++;
      if (prayerDate >= monthAgo) prayersThisMonth++;

      prayerTypeCounts[prayer.prayerType] = (prayerTypeCounts[prayer.prayerType] || 0) + 1;

      if (prayer.status === 'answered' || prayer.status === 'answered_differently') {
        answeredPrayersCount++;
      } else if (prayer.status === 'waiting') {
        waitingPrayersCount++;
      } else if (prayer.status === 'active' || prayer.status === 'ongoing') {
        activePrayersCount++;
      }

      if (prayer.tags) {
        for (const tag of prayer.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const prayerTypeBreakdown = Object.entries(prayerTypeCounts)
      .map(([type, count]) => ({ type: type as prayer_type, count }))
      .sort((a, b) => b.count - a.count);

    const commonTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate prayer streak
    let prayerStreak = 0;
    if (prayers.length > 0) {
      const sortedDates = [...new Set(prayers.map(p => p.date))].sort().reverse();
      const today = DateTime.now().toISODate()!;
      const yesterday = DateTime.now().minus({ days: 1 }).toISODate()!;

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        prayerStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const curr = DateTime.fromISO(sortedDates[i]);
          const prev = DateTime.fromISO(sortedDates[i - 1]);
          if (Math.floor(prev.diff(curr, 'days').days) === 1) {
            prayerStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Scripture reflection stats
    let reflectionsThisWeek = 0;
    for (const reflection of scriptures) {
      const refDate = DateTime.fromISO(reflection.date);
      if (refDate >= weekAgo) reflectionsThisWeek++;

      if (reflection.book) {
        bookCounts[reflection.book] = (bookCounts[reflection.book] || 0) + 1;
      }
    }

    const favoriteBooks = Object.entries(bookCounts)
      .map(([book, count]) => ({ book, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      dailyPassageStreak,
      totalPassagesRead,
      totalPassagesReflected,
      passagesThisWeek,
      totalPrayers: prayers.length,
      prayersThisWeek,
      prayersThisMonth,
      prayerTypeBreakdown,
      answeredPrayersCount,
      waitingPrayersCount,
      activePrayersCount,
      prayerStreak,
      totalScriptureReflections: scriptures.length,
      reflectionsThisWeek,
      commonTags,
      favoriteBooks
    };
  }
}

// Single source of truth for all site content.
// Sources: Girish's existing al-folio repo (projects, teaching, publication, socials, photo)
// plus newer LinkedIn facts (headline, summary, experience, education, awards), which take priority.

export type StationId = 'about' | 'experience' | 'projects' | 'research' | 'teaching' | 'contact'

export interface Station {
  id: StationId
  label: string
  short: string
  color: string // accent color for the station
  hotkey: string
}

export const stations: Station[] = [
  { id: 'about', label: 'About', short: 'whoami', color: '#5eead4', hotkey: '1' },
  { id: 'experience', label: 'Experience', short: 'work history', color: '#f59e0b', hotkey: '2' },
  { id: 'projects', label: 'Projects', short: 'builds & code', color: '#60a5fa', hotkey: '3' },
  { id: 'research', label: 'Research', short: 'papers & labs', color: '#c084fc', hotkey: '4' },
  { id: 'teaching', label: 'TA Experience', short: '16 courses', color: '#4ade80', hotkey: '5' },
  { id: 'contact', label: 'Contact / CV', short: 'say hello', color: '#fb7185', hotkey: '6' },
]

export const profile = {
  name: 'Girish Krishnan',
  handle: 'girish',
  headline: 'Software Engineer @ SpaceX',
  subheadline: 'Electrical Engineering + Math-CS + Physics @ UC San Diego',
  summary:
    "Triple major in Electrical Engineering, Math-CS, and Physics from UC San Diego. I work across the hardware-software stack, from embedded systems and machine learning to full-stack apps and research-grade algorithms. Whether it's building autonomous systems or optimizing code for real-world deployment, I bridge rigorous mathematical theory with practical implementation to solve hard problems.",
  interests: ['Control theory', 'Optimization', 'Machine learning', 'Robotics', 'Autonomous systems', 'Robot perception'],
  photo: 'profile.webp',
}

export interface Experience {
  org: string
  role: string
  start: string
  end: string
  location?: string
  bullets: string[]
  tags?: string[]
}

export const experience: Experience[] = [
  { org: 'SpaceX', role: 'Software Engineer', start: 'Oct 2025', end: 'Present', bullets: ['Software Engineer at Starshield.'] },
  {
    org: 'Qualcomm Institute, UC San Diego',
    role: 'Graduate Student Researcher',
    start: 'Jun 2025',
    end: 'Sep 2025',
    bullets: ['Research assistant in generative AI for music and audio.'],
    tags: ['Generative AI', 'Music & audio'],
  },
  {
    org: 'Argon Robotics',
    role: 'Robotics Software Engineer',
    start: 'Apr 2024',
    end: 'Sep 2025',
    bullets: [
      'Autonomous welding robots for the construction industry.',
      '3D reconstruction pipelines, CNN-based weld seam detection, and precision control.',
    ],
    tags: ['ROS2', 'MoveIt2', 'xArm'],
  },
  {
    org: 'Scripps Institution of Oceanography',
    role: 'Software Engineering Lead, Innovative Marine Technology Lab',
    start: 'Apr 2023',
    end: 'Aug 2025',
    bullets: ['Embedded systems and a full-stack web app controlling oceanographic sensors on an AUV.'],
    tags: ['Raspberry Pi', 'I2C', 'RS-232'],
  },
  {
    org: 'Existential Robotics Lab (UCSD)',
    role: 'Research Assistant',
    start: 'Oct 2022',
    end: 'Oct 2025',
    bullets: [
      'Built a MuJoCo car simulator; trained PPO/SAC policies for real-world F1TENTH deployment on a Jetson TX2 with TensorRT.',
      'Open-source PyBullet robotics education platform (A*, PID, particle filters).',
    ],
    tags: ['MuJoCo', 'PPO', 'SAC', 'TensorRT', 'PyBullet'],
  },
  {
    org: 'Video Processing Lab (UCSD)',
    role: 'Research Assistant',
    start: 'Apr 2022',
    end: 'Jun 2025',
    bullets: [
      'Multi-camera RGB-D 3D human reconstruction and point cloud fusion.',
      'Co-authored a paper accepted at 3DV 2025 (Open-Vocabulary Semantic Part Segmentation of 3D Human).',
    ],
    tags: ['RGB-D', 'Point clouds', '3D vision'],
  },
  {
    org: 'Brain Corp',
    role: 'Applied AI/ML Intern',
    start: 'Jun 2024',
    end: 'Sep 2024',
    bullets: ['Out-of-stock detection in grocery retail: localizing and classifying empty shelf regions.'],
  },
  {
    org: 'Turakhia Lab (UCSD)',
    role: 'Research Assistant',
    start: 'Apr 2023',
    end: 'Mar 2024',
    bullets: [
      'Wastewater SARS-CoV-2 surveillance.',
      'Optimized C++ phylogenetic simulation; deep learning models predicting viral mutations.',
    ],
    tags: ['C++', 'Deep learning'],
  },
  {
    org: 'Neuronflo',
    role: 'ML & CV Software Engineer',
    start: 'Jun 2023',
    end: 'Apr 2024',
    bullets: ['Real-time YOLO PPE detection, a custom annotation GUI, and a live camera monitoring pipeline.'],
    tags: ['YOLO', 'Computer vision'],
  },
  {
    org: 'AI Racing Tech',
    role: 'Software Developer',
    start: 'Jun 2023',
    end: 'Sep 2023',
    bullets: ['TTL computation for MPC control of autonomous race cars in the Indy Autonomous Challenge.'],
    tags: ['MPC'],
  },
  {
    org: 'Yonder Deep',
    role: 'Software Team Lead',
    start: 'May 2022',
    end: 'Jun 2023',
    bullets: [
      'Arctic AUV: PID controllers, Raspberry Pi sensor and motor integration, autonomous diving for acoustic data.',
    ],
    tags: ['PID', 'Raspberry Pi'],
  },
  {
    org: 'Apple Pathways Academy',
    role: 'Apprenticeship',
    start: 'Jan 2022',
    end: 'Jun 2024',
    bullets: [],
  },
]

export const leadership = [
  {
    org: 'IEEE at UC San Diego',
    role: 'Technical Chair',
    when: '2023–24',
    detail: 'Ran ML, computer vision, and robotics workshops.',
  },
  {
    org: 'Eta Kappa Nu (HKN), UC San Diego',
    role: 'Outreach Chair',
    when: '2022–23',
    detail: 'Created and taught ECE 198, a K-12 outreach course.',
  },
]

export const education = [
  {
    school: 'University of California San Diego',
    degree: 'M.S. Electrical & Computer Engineering (Intelligent Systems, Robotics, and Controls)',
    when: '2024–2025',
  },
  {
    school: 'University of California San Diego',
    degree:
      'B.S. Electrical Engineering (ML + Controls) · B.S. Mathematics-Computer Science · B.S. Physics (Computational Physics)',
    when: '2021–2025',
  },
]

export const awards = [
  'Apple Scholar (Apple Pathways Scholars Award)',
  'Best Tutor Award, UCSD ECE',
  'Most Innovative Award, IEEE F1TENTH Competition',
  'Cambridge Outstanding Learner Awards (AS and A levels)',
  'IDEA Scholar',
  'Computer-Aided Design Competition, 1st Place',
]

export const skills = {
  'Programming & AI': ['Python', 'C++', 'CUDA', 'PyTorch', 'TensorFlow', 'scikit-learn', 'Docker', 'Kubernetes'],
  Robotics: ['ROS2', 'MoveIt2', 'MuJoCo', 'PyBullet', 'TensorRT', 'ONNX', 'SLAM', 'Reinforcement learning'],
}

export type ProjectCategory = 'Robotics' | 'Machine Learning' | 'Software' | 'Physics'

export interface Project {
  slug: string
  title: string
  category: ProjectCategory
  description: string
  github: string
  thumb?: string
}

const gh = (repo: string) => `https://github.com/Girish-Krishnan/${repo}`

export const projects: Project[] = [
  { slug: 'mpc-rl-manipulator', title: 'MPC and RL for Mobile Manipulator', category: 'Robotics', description: 'Model Predictive Control and vision-based reinforcement learning for a mobile manipulator robot.', github: gh('MPC-and-RL-Mobile-Manipulator'), thumb: 'ece276c' },
  { slug: 'vi-slam', title: 'Visual-Inertial SLAM', category: 'Robotics', description: 'An EKF that fuses inertial measurements with stereo visual features for robust SLAM.', github: gh('Visual-Inertial-SLAM'), thumb: 'vi_slam' },
  { slug: 'lidar-slam', title: 'LiDAR SLAM', category: 'Robotics', description: 'LiDAR-based SLAM with texture mapping and GTSAM pose graph optimization.', github: gh('LiDAR-SLAM'), thumb: 'lidar_slam' },
  { slug: 'orientation-tracking', title: '3D Orientation Tracking', category: 'Robotics', description: "Estimating a rotating object's 3D orientation from IMU data and stitching camera frames into a panorama.", github: gh('3D-Orientation-Tracking'), thumb: '3d_orientation' },
  { slug: 'stochastic-control', title: 'Infinite Horizon Stochastic Optimal Control', category: 'Robotics', description: 'Receding-horizon certainty equivalent control (CEC) and generalized policy iteration (GPI).', github: gh('Infinite-Horizon-Stochastic-Optimal-Control'), thumb: 'infinite_horizon' },
  { slug: 'motion-planning', title: '3D Motion Planning', category: 'Robotics', description: 'A* and RRT for 3D motion planning.', github: gh('3D-Motion-Planning-A-Star-RRT'), thumb: 'path_planning' },
  { slug: 'door-key', title: 'Dynamic Programming Door Key', category: 'Robotics', description: 'A dynamic programming solution to the Door Key Gym environment.', github: gh('Dynamic-Programming-Door-Key'), thumb: 'dp' },
  { slug: 'quadcopter', title: 'Quadcopter from Scratch', category: 'Robotics', description: 'Custom quadcopter: PCB design, assembly, and embedded C++ for stable flight control.', github: gh('Quadcopter'), thumb: 'quadcopter' },
  { slug: 'story-gen', title: 'Joint Visual–Textual Story Generator', category: 'Machine Learning', description: 'A GPT-style language model combined with Stable Diffusion to generate an illustrated story from a single prompt.', github: gh('Visual-Textual-Story-Generation'), thumb: 'story_gen' },
  { slug: 'seismic-neural-operators', title: 'Neural Operator Benchmarks for Seismic Inversion', category: 'Machine Learning', description: 'Benchmarked eight architectures (Fourier DeepONet, VelocityGAN, FNO, Neural ODEs, ...) mapping seismic waveforms to velocity fields on OpenFWI.', github: gh('ECE-228-Final-Project'), thumb: 'ece228' },
  { slug: 'futuregan', title: 'FutureGAN Video Prediction', category: 'Machine Learning', description: 'Generative adversarial model predicting future video frames of human motion (HMDB).', github: gh('FutureGAN-HMDB-Video-Prediction') },
  { slug: 'rl-curriculum', title: 'Reinforcement Learning Course Curriculum', category: 'Machine Learning', description: 'Programming assignments for COGS 188, an intro class on AI algorithms and RL.', github: gh('AI-Algorithms'), thumb: 'cogs188' },
  { slug: 'laser-line-segmentation', title: 'Semantic Segmentation for Laser Line Detection', category: 'Machine Learning', description: 'A U-Net for semantic segmentation of laser lines in images.', github: gh('Semantic-Segmentation-Laser-Line-Detection'), thumb: 'weld_line' },
  { slug: 'cuda-q-learning', title: 'Multi-Agent Q-Learning with CUDA', category: 'Software', description: 'Single- and multi-agent Q-learning maze solvers in CUDA, C++, and Python.', github: gh('Multi-Agent-Q-Learning-CUDA'), thumb: 'multi_cuda' },
  { slug: 'neural-net-scratch', title: 'Neural Net from Scratch', category: 'Software', description: 'A neural network built from scratch in CUDA, C++, and Python.', github: gh('CUDA-CPP-NeuralNet'), thumb: 'neural_net' },
  { slug: 'mips-regression', title: 'MIPS Assembly Linear Regression', category: 'Software', description: 'Linear regression in MIPS assembly: data parsing, training, and MSE evaluation.', github: gh('MIPS-Assembly-Linear-Regression'), thumb: 'assembly' },
  { slug: 'cartwheel-galaxy', title: 'Cartwheel Galaxy Collision', category: 'Physics', description: 'N-body simulation of two colliding galaxies, with visualization.', github: gh('ucsd-phys141-cartwheel-a'), thumb: 'phys141' },
  { slug: 'double-well-mcmc', title: 'Double Well Potential MCMC', category: 'Physics', description: 'Markov Chain Monte Carlo simulation of a double-well potential.', github: gh('ucsd-phys142-double-well-mcmc-a'), thumb: 'phys142' },
  { slug: 'ising-model', title: 'Ising Model and Block-Spin Transformations', category: 'Physics', description: 'Simulating the Ising model and block-spin renormalization.', github: gh('Computational-Physics-Ising-Model'), thumb: 'phys140a' },
  { slug: 'numerical-physics', title: 'Numerical Physics Simulations', category: 'Physics', description: 'Numerical methods in Python for several complex physical systems.', github: gh('Numerical-Physics-Simulations'), thumb: 'phys_sim' },
]

export const publications = [
  {
    title: 'Open-Vocabulary Semantic Part Segmentation of 3D Human',
    authors: ['Keito Suzuki', 'Bang Du', 'Girish Krishnan', 'Kunyao Chen', 'Runfa Blark Li', 'Truong Nguyen'],
    venue: '3DV 2025',
    year: 2025,
    links: { arXiv: 'https://arxiv.org/abs/2502.19782', PDF: 'https://arxiv.org/pdf/2502.19782.pdf' },
  },
]

export const researchLabs = [
  { lab: 'Qualcomm Institute, UC San Diego', focus: 'Generative AI for music and audio (2025)' },
  { lab: 'Existential Robotics Lab', focus: 'Sim-to-real RL for F1TENTH racing; robotics education platform' },
  { lab: 'Video Processing Lab', focus: 'Multi-camera RGB-D 3D human reconstruction' },
  { lab: 'Turakhia Lab', focus: 'Wastewater SARS-CoV-2 surveillance; viral mutation prediction' },
]

export interface Course {
  code: string
  title: string
  role: string
  quarters: string
  instructor: string
}

export const teachingSummary =
  'Graduate TA, TA, grader, and instructional assistant across ECE, CSE, COGS, MATH, PHYS, and ENG, including 150+ student COGS courses, with a 100% recommendation rate. Recipient of the UCSD ECE Best Tutor Award.'

export const courses: Course[] = [
  { code: 'ECE 273', title: 'Convex Optimization and Applications', role: 'Graduate TA', quarters: 'Spring 2025', instructor: 'Jun-Kun Wang' },
  { code: 'ECE 140A/B', title: 'The Art of Product Engineering I & II', role: 'IA; Graduate TA (140B, Spring 2025)', quarters: 'Winter 2023 – Spring 2025', instructor: 'Ramsin Khoshabeh, Richard Gessner' },
  { code: 'CSE 190', title: 'AI/ML for Music and Audio', role: 'TA', quarters: 'Summer 2024, Summer 2025', instructor: 'Shlomo Dubnov' },
  { code: 'COGS 118A', title: 'Supervised Machine Learning', role: 'TA', quarters: 'Fall 2023', instructor: 'Zhuowen Tu' },
  { code: 'COGS 118B', title: 'Unsupervised Machine Learning', role: 'TA', quarters: 'Winter 2024', instructor: 'Jason Fleischer' },
  { code: 'COGS 188', title: 'AI Algorithms and Reinforcement Learning', role: 'TA', quarters: 'Spring 2024', instructor: 'Jason Fleischer' },
  { code: 'MATH 109', title: 'Mathematical Reasoning', role: 'Grader', quarters: 'Summer 2024, Fall 2024', instructor: 'Amir Mohammadi, Hongyi Sheng' },
  { code: 'MATH 168A', title: 'Random Walks on Graphs', role: 'Grader', quarters: 'Summer 2024', instructor: 'Ioana Dumitriu' },
  { code: 'MATH 31CH', title: 'Honors Vector Calculus', role: 'Grader', quarters: 'Spring 2024', instructor: 'Jeffrey Rabin' },
  { code: 'ECE 16', title: 'Rapid Hardware and Software Design', role: 'IA', quarters: 'Spring 2022 – Winter 2025', instructor: 'Ramsin Khoshabeh' },
  { code: 'ECE 25', title: 'Intro to Digital Design', role: 'IA', quarters: 'Winter 2022, Spring 2022', instructor: 'Karcher Morris, Sujit Dey' },
  { code: 'ECE 198', title: 'HKN K-12 Outreach (created & taught)', role: 'Instructor', quarters: 'Fall 2022 – Spring 2023', instructor: 'Faculty advisor: Truong Nguyen' },
  { code: 'ENG 20', title: 'Introduction to Engineering Research', role: 'IA', quarters: 'Fall 2024', instructor: 'Ekaterina Evdokimenko' },
  { code: 'CSE 175', title: 'Entrepreneurship for Engineers', role: 'IA', quarters: 'Spring 2022', instructor: 'Rakesh Kumar' },
  { code: 'CSE 95', title: 'Tutor Apprenticeship Training', role: 'IA', quarters: 'Fall 2022', instructor: 'Mia Minnes' },
  { code: 'PHYS 1CL', title: 'Waves and Optics Laboratory', role: 'Tutor', quarters: 'Spring 2024', instructor: 'Jessica Arlett' },
]

export const socials = [
  { label: 'Email', value: 'gikrishnan@ucsd.edu', href: 'mailto:gikrishnan@ucsd.edu' },
  { label: 'GitHub', value: 'Girish-Krishnan', href: 'https://github.com/Girish-Krishnan' },
  { label: 'LinkedIn', value: 'in/girk', href: 'https://www.linkedin.com/in/girk' },
  { label: 'Google Scholar', value: 'Scholar profile', href: 'https://scholar.google.com/citations?user=CtpuYxcAAAAJ' },
  { label: 'Kaggle', value: 'girishkrishnan1', href: 'https://www.kaggle.com/girishkrishnan1' },
  { label: 'YouTube', value: '@girishkrishnan8228', href: 'https://www.youtube.com/@girishkrishnan8228' },
  { label: 'Instagram', value: 'girish_k__', href: 'https://www.instagram.com/girish_k__' },
  { label: 'Discord', value: 'girish_', href: '' },
]

export const cvUrl = '/assets/pdf/cv.pdf' // same path as the old al-folio site

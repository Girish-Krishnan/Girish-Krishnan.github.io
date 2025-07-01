// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-publications",
          title: "publications",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "A growing collection of some of my fun projects!",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-teaching",
          title: "teaching",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/teaching/";
          },
        },{id: "nav-repositories",
          title: "repositories",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "nav-cv",
          title: "cv",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "news-graduated-with-a-bachelor-of-science-in-electrical-engineering-mathematics-computer-science-and-physics-from-uc-san-diego-and-finished-all-coursework-required-for-a-master-s-in-electrical-engineering-in-intelligent-systems-and-robotics",
          title: 'Graduated with a Bachelor of Science in Electrical Engineering, Mathematics-Computer Science, and Physics...',
          description: "",
          section: "News",},{id: "projects-neural-operator-benchmarks-for-seismic-inversion",
          title: 'Neural Operator Benchmarks for Seismic Inversion',
          description: "Benchmarked eight neural architectures (including Fourier DeepONet, VelocityGAN, FNO, and Neural ODEs) for mapping seismic waveforms to subsurface velocity fields on the OpenFWI dataset.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project_ml/";
            },},{id: "projects-numerical-physics-simulations",
          title: 'Numerical Physics Simulations',
          description: "Simulating a few complex physical systems using numerical methods in Python.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project_phys/";
            },},{id: "projects-mpc-and-rl-for-mobile-manipulator",
          title: 'MPC and RL for Mobile Manipulator',
          description: "Implementation of Model Predictive Control (MPC) and Vision-Based Reinforcement Learning (RL) for a mobile manipulator robot.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project_robo/";
            },},{id: "projects-multi-agent-q-learning-with-cuda-c-and-python",
          title: 'Multi-Agent Q-Learning with CUDA, C++, and Python',
          description: "Solving a maze using single and multi-agent Q-learning algorithms implemented in CUDA, C++, and Python.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project_sw/";
            },},{id: "projects-reinforcement-learning-course-curriculum",
          title: 'Reinforcement Learning Course Curriculum',
          description: "Created programming assignments for COGS 188, an intro class on RL.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project_ml/";
            },},{id: "projects-ising-model-and-block-spin-transformations",
          title: 'Ising Model and Block-Spin Transformations',
          description: "Simulating the Ising model and block-spin transformations from statistical mechanics.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project_phys/";
            },},{id: "projects-visual-inertial-slam",
          title: 'Visual-Inertial SLAM',
          description: "Using an EKF to fuse inertial measurements with visual data for robust SLAM.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project_robo/";
            },},{id: "projects-neural-net-from-scratch",
          title: 'Neural Net from Scratch',
          description: "Building a neural network from scratch using CUDA, C++, and Python.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project_sw/";
            },},{id: "projects-joint-visual-textual-story-generator",
          title: 'Joint Visual–Textual Story Generator',
          description: "Combining a GPT-style language model with a Stable Diffusion pipeline for generating a short illustrated story from a single prompt in one shot.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project_ml/";
            },},{id: "projects-double-well-potential-mcmc",
          title: 'Double Well Potential MCMC',
          description: "Simulating the double well potential using Markov Chain Monte Carlo (MCMC) methods.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project_phys/";
            },},{id: "projects-lidar-slam",
          title: 'LiDAR SLAM',
          description: "Using LiDAR data for SLAM, creating a texture map, and using GTSAM for pose graph optimization.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project_robo/";
            },},{id: "projects-mips-assembly-linear-regression",
          title: 'MIPS Assembly Linear Regression',
          description: "Implementing linear regression in MIPS Assembly, including data parsing, model training, and error evaluation through Mean Squared Error (MSE) calculation.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project_sw/";
            },},{id: "projects-semantic-segmentation-for-laser-line-detection",
          title: 'Semantic Segmentation for Laser Line Detection',
          description: "Implementing a U-Net model for semantic segmentation of laser lines in images.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project_ml/";
            },},{id: "projects-cartwheel-galaxy-collision-simulation",
          title: 'Cartwheel Galaxy Collision Simulation',
          description: "Simulating the collision of two galaxies using N-body simulations, including gravitational interactions and visualization.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project_phys/";
            },},{id: "projects-3d-orientation-tracking",
          title: '3D Orientation Tracking',
          description: "Estimating a rotating object&#39;s 3D orientation from IMU data and use that pose stream to stitch camera frames into a panoramic texture.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project_robo/";
            },},{id: "projects-infinite-horizon-stochastic-optimal-control",
          title: 'Infinite Horizon Stochastic Optimal Control',
          description: "Implementing receding horizon certainty equivalent control (CEC) and generalized policy iteration (GPI).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_project_robo/";
            },},{id: "projects-3d-motion-planning",
          title: '3D Motion Planning',
          description: "Implementing A* and RRT algorithms for 3D motion planning.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/6_project_robo/";
            },},{id: "projects-dynamic-programming-door-key",
          title: 'Dynamic Programming Door Key',
          description: "Implementing a dynamic programming solution to solve the Door Key Gym environment.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/7_project_robo/";
            },},{id: "projects-cogs-118a",
          title: 'COGS 118A',
          description: "Supervised Machine Learning",
          section: "Projects",handler: () => {
              window.location.href = "/projects/cogs_118a/";
            },},{id: "projects-cogs-118b",
          title: 'COGS 118B',
          description: "Unsupervised Machine Learning",
          section: "Projects",handler: () => {
              window.location.href = "/projects/cogs_118b/";
            },},{id: "projects-cogs-188",
          title: 'COGS 188',
          description: "AI Algorithms and Reinforcement Learning",
          section: "Projects",handler: () => {
              window.location.href = "/projects/cogs_188/";
            },},{id: "projects-cse-175",
          title: 'CSE 175',
          description: "Entrepreneurship for Engineers",
          section: "Projects",handler: () => {
              window.location.href = "/projects/cse_175/";
            },},{id: "projects-cse-190",
          title: 'CSE 190',
          description: "Special Topics in CSE, AI/ML for Music and Audio",
          section: "Projects",handler: () => {
              window.location.href = "/projects/cse_190/";
            },},{id: "projects-cse-95",
          title: 'CSE 95',
          description: "Tutor Apprenticeship Training",
          section: "Projects",handler: () => {
              window.location.href = "/projects/cse_95/";
            },},{id: "projects-ece-140a-amp-b",
          title: 'ECE 140A &amp;amp; B',
          description: "The Art of Product Engineering I &amp; II",
          section: "Projects",handler: () => {
              window.location.href = "/projects/ece_140a-b/";
            },},{id: "projects-ece-16",
          title: 'ECE 16',
          description: "Rapid Hardware and Software Design",
          section: "Projects",handler: () => {
              window.location.href = "/projects/ece_16/";
            },},{id: "projects-ece-198",
          title: 'ECE 198',
          description: "Directed Group Study, HKN Outreach",
          section: "Projects",handler: () => {
              window.location.href = "/projects/ece_198/";
            },},{id: "projects-ece-25",
          title: 'ECE 25',
          description: "Intro to Digital Design",
          section: "Projects",handler: () => {
              window.location.href = "/projects/ece_25/";
            },},{id: "projects-ece-273",
          title: 'ECE 273',
          description: "Convex Optimization and Applications",
          section: "Projects",handler: () => {
              window.location.href = "/projects/ece_273/";
            },},{id: "projects-eng-20",
          title: 'ENG 20',
          description: "Introduction to Engineering Research",
          section: "Projects",handler: () => {
              window.location.href = "/projects/eng_20/";
            },},{id: "projects-math-109",
          title: 'MATH 109',
          description: "Mathematical Reasoning",
          section: "Projects",handler: () => {
              window.location.href = "/projects/math_109/";
            },},{id: "projects-math-168a",
          title: 'MATH 168A',
          description: "Special Topics in Applied Math-CS, Random Walks on Graphs",
          section: "Projects",handler: () => {
              window.location.href = "/projects/math_168a/";
            },},{id: "projects-math-31ch",
          title: 'MATH 31CH',
          description: "Honors Vector Calculus",
          section: "Projects",handler: () => {
              window.location.href = "/projects/math_31ch/";
            },},{id: "projects-phys-1cl",
          title: 'PHYS 1CL',
          description: "Waves and Optics Laboratory",
          section: "Projects",handler: () => {
              window.location.href = "/projects/phys_1cl/";
            },},{
        id: 'social-discord',
        title: 'Discord',
        section: 'Socials',
        handler: () => {
          window.open("https://discord.com/users/girish_", "_blank");
        },
      },{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%67%69%6B%72%69%73%68%6E%61%6E@%75%63%73%64.%65%64%75", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/Girish-Krishnan", "_blank");
        },
      },{
        id: 'social-instagram',
        title: 'Instagram',
        section: 'Socials',
        handler: () => {
          window.open("https://instagram.com/girish_k__", "_blank");
        },
      },{
        id: 'social-kaggle',
        title: 'Kaggle',
        section: 'Socials',
        handler: () => {
          window.open("https://www.kaggle.com/girishkrishnan1", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/girk", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=CtpuYxcAAAAJ", "_blank");
        },
      },{
        id: 'social-youtube',
        title: 'YouTube',
        section: 'Socials',
        handler: () => {
          window.open("https://youtube.com/@girishkrishnan8228", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];

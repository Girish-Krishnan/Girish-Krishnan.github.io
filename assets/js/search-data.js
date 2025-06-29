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
          description: "A growing collection of my cool projects.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-teaching",
          title: "teaching",
          description: "I was fortunate to be a teaching assistant for several courses at UCSD, where I had the opportunity to work with some of the brightest minds in the field. Here are some of the courses I assisted with.",
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
          section: "News",},{id: "projects-cogs-118a",
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

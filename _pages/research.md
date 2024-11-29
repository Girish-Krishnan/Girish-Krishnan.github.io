---
layout: archive
title: "Research"
permalink: /research/
author_profile: true
---

I have worked in a few research labs at UC San Diego.

# Existential Robotics Lab ([existentialrobotics.org](https://existentialrobotics.org/)) [2022-Present]

I worked on 3 different projects in the Existential Robotics Lab, which is led by Dr. Nikolay Atanasov.

## Project 1: Python Robotics

I created a 3D simulator environment using the PyBullet physics engine to implement algorithms for mapping, localization, path planning, and control on an F1TENTH Ackermann drive robot car. Some of the algorithms I implemented include Occupancy Grid Mapping (OGM), Particle Filters, A*, Rapidly-exploring Random Trees (RRT), and PID control. To make these implementations accessible to learners, I created a website that hosts interactive Google Colab Jupyter notebooks and includes easy-to-understand explanations of the algorithms. I presented this work at the Undergraduate Research Conference in Spring 2024 and the GEAR Summer Research Showcase in both 2023 and 2024. During Summer 2024, I also mentored two undergraduate students, guiding them through implementing fundamental robotics algorithms.

[Click here](https://existentialrobotics.org/RobotProvingGrounds/) to view the website for the Python Robotics project.

## Project 2: Reinforcement Learning for Autonomous Robot Navigation

I worked on training an F1TENTH robot car to autonomously navigate environments with unknown obstacle positions using reinforcement learning (RL). I re-implemented much of the codebase from scratch to improve its structure and modularity, documenting the entire process. My work involved training RL policies that take depth images and velocity as inputs and output actions (steering and throttle) to avoid collisions and navigate quickly. For feature extraction, I used a convolutional neural network (CNN). I also developed a ROS node from scratch to deploy the trained policy on a real robot car, leveraging ONNX and NVIDIA TensorRT for inference. Currently, I am experimenting with graph-based feature extractors for point clouds and extending these RL methods to robots with more degrees of freedom, such as a Husky robot with a KUKA arm. This project involved tools and technologies such as Python, PyTorch, TensorRT, MuJoCo, ROS, Jetson TX2, ONNX, OpenCV, and Stable-Baselines3.

## Project 3: Robot Manipulation (in collaboration with KETI)

During Summer 2024, I briefly worked on a project to autonomously move a robot arm while avoiding obstacles. The setup used an Intel RealSense depth camera to generate point clouds, which were then converted into a 3D map of the environment. My contribution involved integrating the Octomap package with ORB SLAM3 to display a 3D map of obstacles in a global frame. This integration was particularly challenging because existing ROS2 packages were designed for datasets like EuRoC and not for live camera feeds. Additionally, these packages didn’t provide the camera pose in quaternion form, which was essential for the setup. I modified and extended these ROS2 packages to enable smooth integration with the live RealSense camera feed, helping the IRL manipulation team generalize their system to dynamic environments.

[Click here](https://github.com/Girish-Krishnan/ros2_orb_slam3) to view the GitHub repository for my modifications to the ORB SLAM3 package.

# Video Processing Lab ([videoprocessing.ucsd.edu](https://videoprocessing.ucsd.edu/)) [2022-Present]

I joined the Video Processing Lab through the ECE Summer Research Internship Program to pursue my interest in computer vision. My work focused on designing a scalable 3D reconstruction system that generates point clouds of human subjects from 2D images and depth maps captured from multiple viewpoints. I implemented the system from scratch, drawing on concepts from graduate-level computer vision courses like CSE 252A to understand camera models, calibration, and 3D geometry. Compared to open-source libraries like Open3D, my implementation was faster and adaptable to any number of cameras.

I built a camera setup using four Intel RealSense D415 cameras, creating a calibration mechanism to determine their relative poses. Using a ChArUco board and IR data, I extended stereocalibration methods to four cameras and improved alignment through bundle adjustment. I refined reconstruction quality by applying noise reduction, smoothing filters, and parameter tuning, ensuring accurate alignment and generating smooth 3D meshes. I also extended the system to capture 3D video, producing a time series of 3D human meshes.

The resulting dataset, representing low-fidelity, in-the-wild 3D human models, was used to validate open-vocabulary 3D human segmentation models developed by Ph.D. students in the lab. This dataset highlighted the models' superior performance in realistic, noisy conditions compared to existing approaches. 

My work was presented at the Undergraduate Summer Research Conference (2022) and you can view my presentation [here](https://youtu.be/_w3hY8K1X6c?si=sZOop8c2vUFSMIDf). I also presented my work at the Center for Wireless Communications (CWC) Beyond 5G, Toward 6G forum in Fall 2022, and my poster can be viewed [here](https://www.linkedin.com/in/girk/overlay/experience/1983649011/multiple-media-viewer/?profileId=ACoAADJnfBIB_IgDdtEio9JIdiKk-xRmtVmVuII&treasuryMediaId=1635508936455).

I co-authored a paper accepted at 3DV 2025, as described in the [Publications](/publications) section, where I described my in-the-wild 3D human dataset and the 3D reconstruction system.

# Turakhia Lab ([turakhia.ucsd.edu](https://turakhia.ucsd.edu/)) [2023-2024]

The Turakhia Lab works at the intersection of computer engineering and computational biology. I joined the Turakhia Lab in Spring 2023 as part of the ECE Summer Research Internship Program at UCSD, and worked as part of the **Wastewater-based Epidemiology (WBE)** project along with Carolyn Zhang and I was mentored by Pranav Gangwar and Dr. Yatish Turakhia. 

WBE involves analyzing wastewater samples to detect the presence of different strains of SARS-CoV-2, the virus that causes COVID-19. The large amount of data generated by WBE requires efficient algorithms to process and analyze the data. The "data" in this case is the RNA sequences of reads from the wastewater samples, and a "read" is a short sequence of nucleotides that is a part of a larger RNA sequence of the virus. 

I initially worked on writing software that implements local alignment algorithms to align reads to a reference genome. This was done so that we could identify what part of the genome the read came from. Then, I helped optimize the C++ code used for the simulation and placement of reads on the reference genome.

Later, I worked on developing a decoder-only transformer model that is trained on a mutation-annotated tree (MAT) and can be used to predict future mutations in the virus.

I presented my work at the UCSD Undergraduate Summer Research Conference in Summer 2023 -- [click here](https://docs.google.com/presentation/d/1U2ZDQmnzmie_gp7WWuCDCXP5p9gVxjkoT9DScIFenwo/edit?usp=sharing) to view my presentation slides.
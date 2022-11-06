# Team Project 

# Team Members
Yuki Lin, Keying Zhang, Xinlin Cai

# Introduction/Overview
Our proposal project is an endless bouncing game, inspired by the phone game Seeking Common Color. The goal of this game is to guide a color-changing, bouncing ball to a same color side wall, and scoring points for each player on every color-matching bounce. The user attempts to guide a ball to hit the same color side wall by pressing the space button, and loses the game when hit different color side walls. This game will have collision detection to detect if the ball hits the same-color side wall and bounce back at a negative symmetric angle. 

# Technical Features
The advanced graphics feature that our game will utilize is Collision Detection. When our player bounces the ball based on a button press, the ball will bounce to either left or right based on the bounce back direction. The first bounce will always go in the left direction. The ball will continually go to the intended direction and drop when it reaches the peak of this bounce. Our player can press the ball multiple times until the ball hits the left or right side wall. The first main collision detection will occur between the ball and the wall. Once collision is detected, and the collision point on the wall is the same color as the ball, the walls will change color. If the collision point on the wall is not the same color as the ball, the game is over. The number of collisions will be recorded.

Another technical feature that our game displays is dynamic object instantiation. As the player progresses in the game more splits will be on the walls, so it is harder to hit the same color as the ball.

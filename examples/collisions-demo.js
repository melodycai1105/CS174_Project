import {defs, tiny} from './common.js';

// Pull these names into this module's scope for convenience:
const {vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Simulation extends Scene {
    // **Simulation** manages the stepping of simulation time.  Subclass it when making
    // a Scene that is a physics demo.  This technique is careful to totally decouple
    // the simulation from the frame rate (see below).
    constructor() {
        super();
        Object.assign(this, {time_accumulator: 0, time_scale: 1, t: 0, dt: 1 / 20, bodies: [], steps_taken: 0});
    }

    simulate(frame_time) {
        // simulate(): Carefully advance time according to Glenn Fiedler's
        // "Fix Your Timestep" blog post.
        // This line gives ourselves a way to trick the simulator into thinking
        // that the display framerate is running fast or slow:
        frame_time = this.time_scale * frame_time;

        // Avoid the spiral of death; limit the amount of time we will spend
        // computing during this timestep if display lags:
        this.time_accumulator += Math.min(frame_time, 0.1);
        // Repeatedly step the simulation until we're caught up with this frame:
        while (Math.abs(this.time_accumulator) >= this.dt) {
            // Single step of the simulation for all bodies:
            this.update_state(this.dt);
            for (let b of this.bodies)
                b.advance(this.dt);
            // Following the advice of the article, de-couple
            // our simulation time from our frame rate:
            this.t += Math.sign(frame_time) * this.dt;
            this.time_accumulator -= Math.sign(frame_time) * this.dt;
            this.steps_taken++;
        }
        // Store an interpolation factor for how close our frame fell in between
        // the two latest simulation time steps, so we can correctly blend the
        // two latest states and display the result.
        let alpha = this.time_accumulator / this.dt;
        for (let b of this.bodies) b.blend_state(alpha);
    }

    make_control_panel() {
        // make_control_panel(): Create the buttons for interacting with simulation time.
        this.key_triggered_button("Speed up time", ["Shift", "T"], () => this.time_scale *= 5);
        this.key_triggered_button("Slow down time", ["t"], () => this.time_scale /= 5);
        this.new_line();
        this.live_string(box => {
            box.textContent = "Time scale: " + this.time_scale
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = "Fixed simulation time step size: " + this.dt
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = this.steps_taken + " timesteps were taken so far."
        });
    }

    update_state(dt)      // update_state(): Your subclass of Simulation has to override this abstract function.
    {
        throw "Override this"
    }
}


export class Test_Data {
    // **Test_Data** pre-loads some Shapes and Textures that other Scenes can borrow.
    constructor() {
        this.textures = {
            rgb: new Texture("assets/rgb.jpg"),
            earth: new Texture("assets/earth.gif"),
            grid: new Texture("assets/grid.png"),
            stars: new Texture("assets/stars.png"),
            text: new Texture("assets/text.png"),
            casino: new Texture("assets/casino.jpg"),
            table: new Texture("assets/table.jpg"),
            start: new Texture("assets/start.png"),
            over: new Texture("assets/over.png")
        }
        this.shapes = {
            donut: new defs.Torus(15, 15, [[0, 2], [0, 1]]),
            cone: new defs.Closed_Cone(4, 10, [[0, 2], [0, 1]]),
            capped: new defs.Capped_Cylinder(4, 12, [[0, 2], [0, 1]]),
            ball: new defs.Subdivision_Sphere(3, [[0, 1], [0, 1]]),
            cube: new defs.Cube(),
            prism: new (defs.Capped_Cylinder.prototype.make_flat_shaded_version())(10, 10, [[0, 2], [0, 1]]),
            gem: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
            donut2: new (defs.Torus.prototype.make_flat_shaded_version())(20, 20, [[0, 2], [0, 1]]),
            //square = new defs.Square(),
            sphere: new defs.Subdivision_Sphere(4),

        };
    }

    random_shape(shape_list = this.shapes) {
        // random_shape():  Extract a random shape from this.shapes.
        const shape_names = Object.keys(shape_list);
        return shape_list[shape_names[~~(shape_names.length * Math.random())]]
    }
}

export class Wall extends Simulation{
    constructor(x, y, z, scale, color, up, low) {
        super();
        this.wallx = x;
        this.wally = y;
        this.wallz = z;
        this.wallscale = scale;
        this.wallcolor = color;
        this.up = up;
        this.low = low;
    }
}

export class Inertia_Demo extends Simulation {
    // ** Inertia_Demo** demonstration: This scene lets random initial momentums
    // carry several bodies until they fall due to gravity and bounce.
    constructor() {
        super();
        this.game_started=false;
        this.game_over=false;
        this.goRight = true;
        this.bounced = true;
        this.score=0;
        this.x = 0;
        this.y = 3;
        this.z = 6;
        this.rightbound = 12.8;
        this.leftbound = -12.9;
        this.upperbound = 14.7;
        this.bottom = -14;
        this.score = 0;
        this.scoreElement = document.getElementById("scoreToUpdate").innerHTML = "<b>Current Score:</b> " + this.score;


        // this.ball_matrix = Mat4.identity().times(Mat4.rotation(-1.59820846, 0, 0, 1)).times(Mat4.translation(0, 3  , 6)).times(Mat4.rotation(Math.PI, 0, 0, 1));
        this.data = new Test_Data();
        this.shapes = Object.assign({}, this.data.shapes);
        this.shapes.square = new defs.Square();
        const shader = new defs.Fake_Bump_Map(1);
        this.material = {
            original:new Material(shader, {
                color: color(.4, .8, .4, 1),
                ambient: .9, diffusivity: 0.9 ,texture: this.data.textures.table
            }),
            test:new Material(shader, {
                color: color(1, .8, 0.7, 1),
                ambient: .5, diffusivity: 0.7 ,texture: this.data.textures.casino
            }),
            startGame:new Material(shader, {
                color: color(0, 0, 0, 1),
                ambient: .9, diffusivity: 0.9 ,texture: this.data.textures.start
            }),
            gameOver:new Material(shader, {
                color: color(0, 0, 0, 1),
                ambient: .9, diffusivity: 0.9 ,texture: this.data.textures.over
            })
        };
        this.bounce_angle = 0.5 * Math.PI;
        this.count = 0;
        this.changeDirection = false;

        this.colors = [color(1, 1, 1, 1), color(0, 0, 0, 1), color(1, 0, 0, 1), color(0, 0, 1, 1)];
        this.ballcolor = this.colors[0];
        this.rightWalls = [new Wall(), new Wall(), new Wall(), new Wall()];
        this.leftWalls = [new Wall(), new Wall(), new Wall(), new Wall()];
    }

    move_left() {
        this.ball_matrix = this.ball_matrix.times(Mat4.translation(0,2,0));
    }

    move_right() {
        this.ball_matrix = this.ball_matrix.times(Mat4.translation(0,-2,0));
    }

    move_up() {
        this.ball_matrix = this.ball_matrix.times(Mat4.translation(2,0,0));
    }

    move_down() {
        this.ball_matrix = this.ball_matrix.times(Mat4.translation(-2,0,0));
    }

    // bounce(context, program_state){
    //     // const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
    //     // // let ball_angle=-Math.PI*t;
    //     // let ball_angle = Math.PI / 2 + Math.sin(3 * t + Math.PI / 2);
    //     // if (t <= 0.9) {
    //     //     ball_angle = Math.PI / 2 + Math.sin(3 * t + Math.PI / 2);
    //     // } else {
    //     //     ball_angle = Math.PI / 2 + Math.sin(3 * 0.9 + Math.PI / 2)
    //     // }
    //     // this.ball_matrix = this.ball_matrix.times(Mat4.rotation(-ball_angle, 0, 0, 1)).times(Mat4.translation(0, 3 + 5 * t, 6)).times(Mat4.rotation(Math.PI, 0, 0, 1))
    //     //     .times(Mat4.scale(1, 1, 1));
    //
    // }
    random_color() {
        return this.material.original.override(color(.6, .6 * Math.random(), .6 * Math.random(), 1));
    }

    update_state(dt) {
        // update_state():  Override the base time-stepping code to say what this particular
        // scene should do to its bodies every frame -- including applying forces.
        // Generate additional moving bodies if there ever aren't enough:
        while (this.bodies.length < 150)
            this.bodies.push(new Body(this.data.random_shape(), this.random_color(), vec3(1, 1 + Math.random(), 1))
                .emplace(Mat4.translation(...vec3(0, 15, 0).randomized(10)),
                    vec3(0, -1, 0).randomized(2).normalized().times(3), Math.random()));

        for (let b of this.bodies) {
            // Gravity on Earth, where 1 unit in world space = 1 meter:
            b.linear_velocity[1] += dt * -9.8;
            // If about to fall through floor, reverse y velocity:
            if (b.center[1] < -8 && b.linear_velocity[1] < 0)
                b.linear_velocity[1] *= -.8;
        }
        // Delete bodies that stop or stray too far away:
        this.bodies = this.bodies.filter(b => b.center.norm() < 50 && b.linear_velocity.norm() > 2);
    }

    generateWalls(context, program_state){
        if(this.count == 0) {
            const rightwall1 = new Wall(13.3, 7.5, 7, 7, this.colors[0], 13.5, 0.4999999999999996);
            const rightwall2 = new Wall(13.3, -7, 7, 7.5, this.colors[1], 0.4999999999999996, -13.7);
            this.rightWalls[0] = rightwall1;
            this.rightWalls[1] = rightwall2;

            //right side walls
            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall1.wallx, rightwall1.wally, rightwall1.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall1.wallscale, 0.5)), this.material.original.override({color: rightwall1.wallcolor}));

            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall2.wallx, rightwall2.wally, rightwall2.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall2.wallscale, 0.5)), this.material.original.override({color: rightwall2.wallcolor}));

            const leftwall1 = new Wall(-13.3, 9.8, 7, 4.8, this.colors[1], 13.5, 5.1);
            const leftwall2 = new Wall(-13.3, -4.8, 7, 9.8, this.colors[0], 5.1, -13.7);
            this.leftWalls[0] = leftwall1;
            this.leftWalls[1] = leftwall2;

            //left side walls
            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall1.wallx, leftwall1.wally, leftwall1.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall1.wallscale, 0.5)), this.material.original.override({color: leftwall1.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall2.wallx, leftwall2.wally, leftwall2.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall2.wallscale, 0.5)), this.material.original.override({color: leftwall2.wallcolor}));

        }else if(this.count == 1){
            //right side wall
            const rightwall1 = new Wall(13.3, 10.5, 7, 4, this.colors[0], 13.5, 6.7);
            const rightwall2 = new Wall(13.3, 3.5, 7, 3, this.colors[1], 6.7, 0.5);
            const rightwall3 = new Wall(13.3, -7, 7, 7.5, this.colors[2], 0.5, -13.7);
            this.rightWalls[0] = rightwall1;
            this.rightWalls[1] = rightwall2;
            this.rightWalls[2] = rightwall3;

            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall1.wallx, rightwall1.wally, rightwall1.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall1.wallscale, 0.5)), this.material.original.override({color: rightwall1.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall2.wallx, rightwall2.wally, rightwall2.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall2.wallscale, 0.5)), this.material.original.override({color: rightwall2.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall3.wallx, rightwall3.wally, rightwall3.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall3.wallscale, 0.5)), this.material.original.override({color: rightwall3.wallcolor}));

            //left side wall
            const leftwall1 = new Wall(-13.3, 9.5, 7, 5, this.colors[2], 13.5, 4.5);
            const leftwall2 = new Wall(-13.3, -1.5, 7, 6, this.colors[0], 4.5, -7.7);
            const leftwall3 = new Wall(-13.3, -11, 7, 3.5, this.colors[1], -7.7, -13.7);

            this.leftWalls[0] = leftwall1;
            this.leftWalls[1] = leftwall2;
            this.leftWalls[2] = leftwall3;

            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall1.wallx, leftwall1.wally, leftwall1.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall1.wallscale, 0.5)), this.material.original.override({color: leftwall1.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall2.wallx, leftwall2.wally, leftwall2.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall2.wallscale, 0.5)), this.material.original.override({color: leftwall2.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall3.wallx, leftwall3.wally, leftwall3.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall3.wallscale, 0.5)), this.material.original.override({color: leftwall3.wallcolor}));
       }else if(this.count == 2){
            //right side wall
            const rightwall1 = new Wall(13.3, 11.5, 7, 3, this.colors[2], 13.5, 8.7);
            const rightwall2 = new Wall(13.3, 4.5, 7, 4, this.colors[1], 8.7, 0.5);
            const rightwall3 = new Wall(13.3, -4.5, 7, 5, this.colors[0], 0.5, -9.9);
            const rightwall4 = new Wall(13.3, -12, 7, 2.5, this.colors[3], -9.9, -13.7);
            this.rightWalls[0] = rightwall1;
            this.rightWalls[1] = rightwall2;
            this.rightWalls[2] = rightwall3;
            this.rightWalls[3] = rightwall4;

            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall1.wallx, rightwall1.wally, rightwall1.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall1.wallscale, 0.5)), this.material.original.override({color: rightwall1.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall2.wallx, rightwall2.wally, rightwall2.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall2.wallscale, 0.5)), this.material.original.override({color: rightwall2.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall3.wallx, rightwall3.wally, rightwall3.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall3.wallscale, 0.5)), this.material.original.override({color: rightwall3.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(rightwall4.wallx, rightwall4.wally, rightwall4.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, rightwall4.wallscale, 0.5)), this.material.original.override({color: rightwall4.wallcolor}));

            //left side wall
            const leftwall1 = new Wall(-13.3, 12.5, 7, 2, this.colors[1], 13.5, 10.7);
            const leftwall2 = new Wall(-13.3, 4.5, 7, 6, this.colors[2], 10.7, -1.7);
            const leftwall3 = new Wall(-13.3, -4, 7, 2.5, this.colors[3], -1.7, -6.7);
            const leftwall4 = new Wall(-13.3, -10.4, 7, 3.9, this.colors[0], -6.7, -13.7);

            this.leftWalls[0] = leftwall1;
            this.leftWalls[1] = leftwall2;
            this.leftWalls[2] = leftwall3;
            this.leftWalls[3] = leftwall4;

            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall1.wallx, leftwall1.wally, leftwall1.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall1.wallscale, 0.5)), this.material.original.override({color: leftwall1.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall2.wallx, leftwall2.wally, leftwall2.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall2.wallscale, 0.5)), this.material.original.override({color: leftwall2.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall3.wallx, leftwall3.wally, leftwall3.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall3.wallscale, 0.5)), this.material.original.override({color: leftwall3.wallcolor}));
            this.shapes.cube.draw(context, program_state, Mat4.translation(leftwall4.wallx, leftwall4.wally, leftwall4.wallz)
                .times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(0.7, leftwall4.wallscale, 0.5)), this.material.original.override({color: leftwall4.wallcolor}));
        }
        this.changeDirection = false;
    }
    //bounce the ball button
    make_control_panel() {
        this.key_triggered_button("start game", ["z"],()=> {
            this.game_started = true;
        });
        this.key_triggered_button("make game over", ["x"],()=> {
            this.game_over = true;
        });

        this.key_triggered_button("bounce the ball", ["q"], () => {
                this.game_started = true;
                this.bounced = false;
            }
        );
        this.key_triggered_button("right", ["d"], () => this.move_right());
        this.key_triggered_button("left", ["a"], () => this.move_left());
        this.key_triggered_button("up", ["w"], () => this.move_up());
        this.key_triggered_button("down", ["s"], () => this.move_down());
    }

    display(context, program_state) {
        // display(): Draw everything else in the scene besides the moving bodies.
        // super.display(context, program_state);

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            this.children.push(new defs.Program_State_Viewer());
            program_state.set_camera(Mat4.translation(0, 0, -50));    // Locate the camera here (inverted matrix).
        }
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
        program_state.lights = [new Light(vec4(0, -5, -10, 1), color(1, 1, 1, 1), 100000)];
 

        //Building side walls
        let model_transform = Mat4.identity();
        //Draw ball
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        // console.log(this.bounced);
        //before game start

        if(!this.game_started){
            //game start lable
            let start_matrix=Mat4.identity();
            start_matrix = start_matrix.times(Mat4.translation(0, 0, 7))
                //.times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(15, 15, 1))

            this.shapes.cube.draw(context, program_state, start_matrix,this.material.startGame);
        }
        if(this.game_over){
            //game start lable
            let start_matrix=Mat4.identity();
            start_matrix = start_matrix.times(Mat4.translation(0, 0, 7))
                //.times(Mat4.rotation(Math.PI, 1, 0, 0))
                .times(Mat4.scale(15, 15, 1))

            this.shapes.cube.draw(context, program_state, start_matrix,this.material.gameOver);
        }
        if(!this.game_started){

            model_transform = model_transform.times(Mat4.translation(0, 3, 6));
            this.shapes.sphere.draw(context, program_state, model_transform , this.material.original.override({color: this.ballcolor}));
        }//else
        if(!this.bounced && (!this.game_over)) {
            this.bounce_angle += 0.5 * dt * 1.2 * Math.PI;
            let model_transform = Mat4.identity();

            //bounce to right is this.x - 0.17 * Math.cos(this.bounce_angle);
            //bounce to left is this.x + 0.17 * Math.cos(this.bounce_angle);
            if (this.goRight) {
                this.x = this.x - 0.05 * Math.cos(this.bounce_angle);
            } else {
                this.x = this.x + 0.05 * Math.cos(this.bounce_angle);
            }

            this.y = this.y + 0.15 * Math.sin(this.bounce_angle);
            if (this.y + 1 >= this.upperbound || this.y <= this.bottom) {
                this.game_over = true;
            }
            if ((this.goRight && this.x + 1 >= this.rightbound)) {
                console.log(this.y);
                if (this.y > this.rightWalls[0].low && this.y < this.rightWalls[0].up) {
                    if (this.ballcolor == this.rightWalls[0].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.y > this.rightWalls[1].low && this.y < this.rightWalls[1].up) {
                    if (this.ballcolor == this.rightWalls[1].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.count == 1) {
                    if (this.y > this.rightWalls[2].low && this.y < this.rightWalls[2].up) {
                        if (this.ballcolor == this.rightWalls[2].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                } else if (this.count == 2) {
                    if (this.y > this.rightWalls[3].low && this.y < this.rightWalls[3].up) {
                        if (this.ballcolor == this.rightWalls[3].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                }
            }
            else if((!this.goRight &&this.x-1 <= this.leftbound)){
                console.log((this.y))
                if (this.y > this.leftWalls[0].low && this.y < this.leftWalls[0].up) {
                    if (this.ballcolor == this.leftWalls[0].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.y > this.leftWalls[1].low && this.y < this.leftWalls[1].up) {
                    if (this.ballcolor == this.leftWalls[1].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.count == 1) {
                    if (this.y > this.leftWalls[2].low && this.y < this.leftWalls[2].up) {
                        if (this.ballcolor == this.leftWalls[2].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                } else if (this.count == 2) {
                    if (this.y > this.leftWalls[3].low && this.y < this.leftWalls[3].up) {
                        if (this.ballcolor == this.leftWalls[3].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                }
            }

            model_transform = model_transform.times(Mat4.translation(this.x, this.y, this.z));
            this.y = this.y + 0.015 * Math.sin(this.bounce_angle);
            if(this.bounce_angle >= 1.1*Math.PI)
            {
                // console.log("reach here");
                this.bounced = true;
                this.bounce_angle = 0.5 * Math.PI;
            }

            this.shapes.sphere.draw(context, program_state, model_transform, this.material.original.override({color: this.ballcolor}));//this.bounced = true;

         }
        else if(this.y +1 >= this.upperbound || this.y <= this.bottom){
            this.game_over =true;
        }
        else if(this.game_started && (!this.game_over)){
            if((this.goRight &&this.x+1 >= this.rightbound)){
                console.log(this.y);
                if (this.y > this.rightWalls[0].low && this.y < this.rightWalls[0].up) {
                    if (this.ballcolor == this.rightWalls[0].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.y > this.rightWalls[1].low && this.y < this.rightWalls[1].up) {
                    if (this.ballcolor == this.rightWalls[1].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.count == 1) {
                    if (this.y > this.rightWalls[2].low && this.y < this.rightWalls[2].up) {
                        if (this.ballcolor == this.rightWalls[2].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                } else if (this.count == 2) {
                    if (this.y > this.rightWalls[3].low && this.y < this.rightWalls[3].up) {
                        if (this.ballcolor == this.rightWalls[3].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                }
            }
            else if((!this.goRight &&this.x-1 <= this.leftbound)) {
                console.log((this.y))

                if (this.y > this.leftWalls[0].low && this.y < this.leftWalls[0].up) {
                    if (this.ballcolor == this.leftWalls[0].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.y > this.leftWalls[1].low && this.y < this.leftWalls[1].up) {
                    if (this.ballcolor == this.leftWalls[1].wallcolor) {
                        this.goRight = !this.goRight;
                        this.changeDirection = true;
                    } else {
                        this.game_over = true;
                    }
                } else if (this.count == 1) {
                    if (this.y > this.leftWalls[2].low && this.y < this.leftWalls[2].up) {
                        if (this.ballcolor == this.leftWalls[2].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                } else if (this.count == 2) {
                    if (this.y > this.leftWalls[3].low && this.y < this.leftWalls[3].up) {
                        if (this.ballcolor == this.leftWalls[3].wallcolor) {
                            this.goRight = !this.goRight;
                            this.changeDirection = true;
                        } else {
                            this.game_over = true;
                        }
                    }
                }
            }
            let model_trans_rotate = Mat4.identity();
            this.y = this.y - 0.2;
            if(this.goRight){
                this.x = this.x + 0.05;
            }else{
                this.x = this.x - 0.05;
            }
            model_transform = model_trans_rotate.times(Mat4.translation(this.x, this.y, this.z));
            // console.log("x: "+ this.x)
            // console.log("y: "+ this.y)
            // console.log("z: "+ this.z)
            //
            // console.log("t: "+ t)

            this.shapes.sphere.draw(context, program_state,model_transform , this.material.original.override({color: this.ballcolor }));
        }





        model_transform = Mat4.identity();
        let table_transform = model_transform;
        table_transform = table_transform.times(Mat4.translation(0, 0, 5))
                                         .times(Mat4.rotation(Math.PI, 1, 0, 0))
                                         .times(Mat4.scale(14, 16, 1))
        let table_transform1 = model_transform;
        table_transform1 = table_transform.times(Mat4.translation(0, 0, 2))
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(3, 3, 1))

        this.shapes.cube.draw(context, program_state, table_transform1,this.material.test);
        this.shapes.cube.draw(context, program_state, table_transform,this.material.original.override({color: color(1,0.5,0,1)}));
       // this.data.textures.game
        const gold = color(1, 0.876, 0, 1);
        this.shapes.cube.draw(context, program_state,Mat4.translation(0,  15, 7)
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(14, 0.5, 0.5)), this.material.original.override({color: gold}));
        //draw the bottom wall:
        this.shapes.cube.draw(context, program_state,Mat4.translation(0,  -15, 7)
            .times(Mat4.rotation(Math.PI, 1, 0, 0))
            .times(Mat4.scale(14, 0.5, 0.5)), this.material.original.override({color: gold}));

        //draw the side walls

        // let count = 0;
        // if (this.changeDirection){
        //     count = Math.floor(Math.random() * 3);
        // }
        if (this.changeDirection) {
            let prev_c = this.count;
            while (this.count == prev_c){
                this.count = Math.floor(Math.random() * 3);
            }
            for (let i = 0; i < this.count + 2; i++) {
                this.colors[i] = color(Math.random(), Math.random(), Math.random(), 1.0);
            }
            let index = Math.floor(Math.random() * (this.count + 2));
            this.ballcolor = this.colors[index];
            this.changeDirection = false;
        }
        // console.log(this.count);

        this.generateWalls(context, program_state);
        // if (!this.changeDirection){
        //     this.changeDirection = true;
        // }
    }
}


// export class Collision_Demo extends Simulation {
//     // **Collision_Demo** demonstration: Detect when some flying objects
//     // collide with one another, coloring them red.
//     constructor() {
//         super();
//         this.data = new Test_Data();
//         this.shapes = Object.assign({}, this.data.shapes);
//         // Make simpler dummy shapes for representing all other shapes during collisions:
//         this.colliders = [
//             {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: .5},
//             {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(2), leeway: .3},
//             {intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1}
//         ];
//         this.collider_selection = 0;
//         // Materials:
//         const phong = new defs.Phong_Shader(1);
//         const bump = new defs.Fake_Bump_Map(1)
//         this.inactive_color = new Material(bump, {
//             color: color(.5, .5, .5, 1), ambient: .2,
//             texture: this.data.textures.rgb
//         });
//         this.active_color = this.inactive_color.override({color: color(.5, 0, 0, 1), ambient: .5});
//         this.bright = new Material(phong, {color: color(0, 1, 0, .5), ambient: 1});
//     }
//
//     make_control_panel() {
//         this.key_triggered_button("Previous collider", ["b"], this.decrease);
//         this.key_triggered_button("Next", ["n"], this.increase);
//         this.new_line();
//         super.make_control_panel();
//     }
//
//     increase() {
//         this.collider_selection = Math.min(this.collider_selection + 1, this.colliders.length - 1);
//     }
//
//     decrease() {
//         this.collider_selection = Math.max(this.collider_selection - 1, 0)
//     }
//
//     update_state(dt, num_bodies = 40) {
//         // update_state():  Override the base time-stepping code to say what this particular
//         // scene should do to its bodies every frame -- including applying forces.
//         // Generate moving bodies:
//         while (this.bodies.length < num_bodies)
//             this.bodies.push(new Body(this.data.random_shape(), undefined, vec3(1, 5, 1))
//                 .emplace(Mat4.translation(...unsafe3(0, 0, 0).randomized(30))
//                         .times(Mat4.rotation(Math.PI, ...unsafe3(0, 0, 0).randomized(1).normalized())),
//                     unsafe3(0, 0, 0).randomized(20), Math.random()));
//         // Sometimes we delete some so they can re-generate as new ones:
//         this.bodies = this.bodies.filter(b => (Math.random() > .01) || b.linear_velocity.norm() > 1);
//
//         const collider = this.colliders[this.collider_selection];
//         // Loop through all bodies (call each "a"):
//         for (let a of this.bodies) {
//             // Cache the inverse of matrix of body "a" to save time.
//             a.inverse = Mat4.inverse(a.drawn_location);
//
//             a.linear_velocity = a.linear_velocity.minus(a.center.times(dt));
//             // Apply a small centripetal force to everything.
//             a.material = this.inactive_color;
//             // Default color: white
//
//             if (a.linear_velocity.norm() == 0)
//                 continue;
//             // *** Collision process is here ***
//             // Loop through all bodies again (call each "b"):
//             for (let b of this.bodies) {
//                 // Pass the two bodies and the collision shape to check_if_colliding():
//                 if (!a.check_if_colliding(b, collider))
//                     continue;
//                 // If we get here, we collided, so turn red and zero out the
//                 // velocity so they don't inter-penetrate any further.
//                 a.material = this.active_color;
//                 a.linear_velocity = vec3(0, 0, 0);
//                 a.angular_velocity = 0;
//             }
//         }
//     }
//
//     display(context, program_state) {
//         // display(): Draw everything else in the scene besides the moving bodies.
//         super.display(context, program_state);
//         if (!context.scratchpad.controls) {
//             this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
//             this.children.push(new defs.Program_State_Viewer());
//             program_state.set_camera(Mat4.translation(0, 0, -50));
//             // Locate the camera here (inverted matrix).
//         }
//         program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
//         program_state.lights = [new Light(vec4(.7, 1.5, 2, 0), color(1, 1, 1, 1), 100000)];
//
//         // Draw an extra bounding sphere around each drawn shape to show
//         // the physical shape that is really being collided with:
//         const {points, leeway} = this.colliders[this.collider_selection];
//         const size = vec3(1 + leeway, 1 + leeway, 1 + leeway);
//         for (let b of this.bodies)
//             points.draw(context, program_state, b.drawn_location.times(Mat4.scale(...size)), this.bright, "LINE_STRIP");
//     }
//
//     show_explanation(document_element) {
//         document_element.innerHTML += `<p>This demo detects when some flying objects collide with one another, coloring them red when they do.  For a simpler demo that shows physics-based movement without objects that hit one another, see the demo called Inertia_Demo.
//                                      </p><p>Detecting intersections between pairs of stretched out, rotated volumes can be difficult, but is made easier by being in the right coordinate space.  The collision algorithm treats every shape like an ellipsoid roughly conforming to the drawn shape, and with the same transformation matrix applied.  Here these collision volumes are drawn in translucent purple alongside the real shape so that you can see them.
//                                      </p><p>This particular collision method is extremely short to code, as you can observe in the method \"check_if_colliding\" in the class called Body below.  It has problems, though.  Making every collision body a stretched sphere is a hack and doesn't handle the nuances of the actual shape being drawn, such as a cube's corners that stick out.  Looping through a list of discrete sphere points to see if the volumes intersect is *really* a hack (there are perfectly good analytic expressions that can test if two ellipsoids intersect without discretizing them into points, although they involve solving a high order polynomial).   On the other hand, for non-convex shapes a real collision method cannot be exact either, and is usually going to have to loop through a list of discrete tetrahedrons defining the shape anyway.
//                                      </p><p>This scene extends class Simulation, which carefully manages stepping simulation time for any scenes that subclass it.  It totally decouples the whole simulation from the frame rate, following the suggestions in the blog post <a href=\"https://gafferongames.com/post/fix_your_timestep/\" target=\"blank\">\"Fix Your Timestep\"</a> by Glenn Fielder.  Buttons allow you to speed up and slow down time to show that the simulation's answers do not change.</p>`;
//     }
// }
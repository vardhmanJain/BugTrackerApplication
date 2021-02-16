const express  = require("express");
const mongoose  = require("mongoose")
const app = express();
const session = require('express-session')




const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    bounty: Number,
    bugsreported: [String]
})
const BugSchema = new mongoose.Schema({
    bugdescription: {
        type: String,
        required: true
    },
    userid: String,
    status:{
        type: String,
        enum: ["new","assigned","open","rejected","fixed"],
        default: "new"
    },
    reportedon: {
        type: Date,
        default: Date.now()
    },
    assignedto : String
})
const TeamSchema = new mongoose.Schema({
    username: String,
    password: String,

})

const Bug  = mongoose.model("Bug",BugSchema);
const User  = mongoose.model("User",UserSchema);
const Team  = mongoose.model("Team",TeamSchema);

//middleware
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: 'vardhman',
    resave: false,
    saveUninitialized: true
}))
mongoose.connect("mongodb://localhost/BugTrackingApplication",{useNewUrlParser: true,useUnifiedTopology: true})
.then(()=>console.log("database connected"))
.catch(console.log)

const verifyUser = (req, res, next)=>{
    if(req.session.userId){
        next();
    }
    else{
        res.redirect("/user");
    }
}

//routes start from here
app.get("/",(req, res)=>{   //landing page for the application includes a signup option for new users and login options for users and admins
    res.render("index.ejs");
})
app.get("/user/new", (req, res)=>{  //signup page for new users of the application
    res.render("signup.ejs");
})
app.post("/user/new", (req, res)=>{  //new user added to the database **add middleware to encript passwords
    new User(req.body).save();
    res.redirect("/user");
})
app.get("/user", (req, res)=>{    //login page for the user
    res.render("login.ejs")
})
app.post("/user",async (req,res)=>{  //check if a user exits with the given credentials if yes redirect to the user dashboard else to the login
    const user = await User.findOne(req.body);
    // console.log(user._id);
    if(user !== null){
        // res.render("user/index.ejs",{user});
        req.session.userId = user._id;
        res.redirect(`/user/dashboard`);
    }else{
        res.redirect("/user");
    }
})
app.get("/user/dashboard",verifyUser, async (req,res)=>{
   
        const user = await User.findById(req.session.userId);
        console.log(req.session.userId);
        res.render("user/index.ejs",{user});
        
})

app.get("/bug/new",verifyUser, async(req,res)=>{       //user wants to report a new bug
    
        const user = await User.findById(req.session.userId);
        res.render("bug/new.ejs",{user});
    
    
})
app.post("/bug/new",verifyUser, async (req,res)=>{   //handles the addition of bugdescription in bugs collection along with the bug id added to the users bugsreported list
  
        const id = req.session.userId;
        const user = await User.findById(id);
        const {bugdescription} = req.body;
        const bug = new Bug({bugdescription: bugdescription,userid: user._id.toString()});
        await bug.save();
        user.bugsreported.push(bug._id.toString());
        await user.save();
        res.redirect(`/user/dashboard`);
    
    
})
//admin
app.get("/authority",(req,res)=>{
    res.render("authoritylogin.ejs");
})

app.post("/authoritylogin",async (req,res)=>{
    const {username, usertype, password} = req.body;
    if(usertype === "admin"){
        if(username === "admin@gmail.com" && password === "admin123"){
            req.session.userId  = "admin";           
            res.redirect("/admin");
        }
    }else if(usertype === "team"){
        const team = await Team.findOne({username: username, password : password});
        if(team !== null){
            req.session.sessionId = team._id;
            res.redirect("/teams");
        }
    }else{
        res.redirect("/authority");
    }
})
app.get("/admin", async (req,res)=>{
    if(req.session.userId === "admin"){
        // const unassigned = await Bug.find({status: "open"});
        const newbugs = await Bug.find({status : "new"});
        
        // await Bug.updateMany({status: "new"},{status: "open" });
        const assigned = await Bug.find({status: "assigned"});
        const open = await Bug.find({status: "open"});
        res.render("admin/index.ejs",{open, newbugs, assigned});
    }else{
        res.redirect("/authority");
    }
    
})
app.get("/admin/bug/:id",async (req,res)=>{
    if(req.session.userId === "admin"){
        const id = req.params.id;
        const bug = await Bug.findById(id);
        const teams = await Team.find({},"username");
        console.log(teams);
        res.render("admin/bug.ejs",{bug, teams});
    }else{
        res.redirect("/authoritylogin");
    }
})
app.post("/admin/bug/:id",async (req,res)=>{
    const {status, teamid} = req.body;
    console.log(req.body);
    console.log(status);
    const id  = req.params.id;
    Bug.updateOne({_id: id},{status : status, assignedto: teamid}).then(res=>console.log(status));
    
    
    res.redirect("/admin");
})
app.get("/admin/team/new",(req,res)=>{
    if(req.session.userId === "admin"){
        res.render("teams/new.ejs");
    }else{
        res.redirect("/authority");
    }
})
app.post("/admin/team/new",(req,res)=>{
    new Team(req.body).save();
    res.redirect("/admin")
})
app.get("/logout",(req,res)=>{
    req.session.destroy();
    res.redirect("/");
})
//teams
app.get("/teams",async (req,res)=>{
    if(req.session.sessionId){
        const assigned  = await Bug.find({assignedto: req.session.sessionId, status: "assigned"});
        const open = await Bug.find({assignedto : req.session.sessionId, status: "open"});
        const team = await Team.findById(req.session.sessionId);
        console.log(team);
        res.render("teams/index.ejs", {assigned, open, team});
    }
})

app.listen(3000,()=>{
    console.log("server started");
})

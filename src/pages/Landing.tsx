import { motion } from "framer-motion";
import { GraduationCap, PenTool, Gamepad2, BookOpen, Trophy, ArrowRight, Globe, Box, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const features = [
  { icon: PenTool, title: "Házi Feladat Szerkesztő", desc: "Készíts és kezeld házi feladataidat egyszerűen", color: "bg-primary/10 text-primary" },
  { icon: Gamepad2, title: "Tanulós Játékok", desc: "Tanulj szórakoztató játékokon keresztül", color: "bg-accent/10 text-accent" },
  { icon: BookOpen, title: "Dolgozatok & Tesztek", desc: "Gyakorolj tesztekkel és készülj a dolgozatokra", color: "bg-warning/10 text-warning" },
  { icon: Trophy, title: "Eredmények Követése", desc: "Kövesd nyomon a fejlődésedet", color: "bg-success/10 text-success" },
];

const gameTypes = [
  { title: "Browser Játékok", desc: "5+ játék, Offline is játszható", icon: Globe, color: "from-primary to-secondary" },
  { title: "3D Játékok", desc: "5+ játék, Térben tanulhatsz", icon: Box, color: "from-secondary to-accent" },
  { title: "Logikai Játékok", desc: "6+ játék, Agytorna feladatok", icon: Brain, color: "from-accent to-warning" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold text-primary-foreground">TanuljVelem</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-primary-foreground hover:bg-white/20 rounded-full font-semibold" asChild>
              <Link to="/login">Bejelentkezés</Link>
            </Button>
            <Button variant="outline" className="border-2 border-primary-foreground text-primary-foreground bg-transparent hover:bg-white/10 rounded-full font-bold" asChild>
              <Link to="/register">Regisztráció</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black text-primary-foreground leading-tight mb-6"
          >
            Tanulj Okosabban,{" "}
            <span className="text-warning italic">Játssz Jobban!</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10"
          >
            A te személyes tanulási segítőd házi feladatokhoz és szórakoztató tanulós játékokhoz 1–12. osztályig
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Button size="lg" className="bg-warning text-warning-foreground hover:bg-warning/90 rounded-full text-lg font-bold px-8 shadow-xl" asChild>
              <Link to="/register">
                Kezdjük! <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-primary-foreground text-primary-foreground hover:bg-white/10 rounded-full text-lg font-bold px-8" asChild>
              <Link to="/games">Játékok Böngészése</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-3xl md:text-4xl font-black text-center mb-4"
          >
            Minden Ami a Tanuláshoz Kell
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-muted-foreground text-center mb-12 text-lg">
            Fedezd fel a TanuljVelem funkcióit
          </motion.p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i + 2}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-xl transition-shadow group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Game Types */}
      <section className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Játéktípusok</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {gameTypes.map((g, i) => (
              <motion.div
                key={g.title}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-card rounded-3xl overflow-hidden border border-border hover:shadow-2xl transition-all group"
              >
                <div className={`h-40 bg-gradient-to-br ${g.color} flex items-center justify-center`}>
                  <g.icon className="w-16 h-16 text-primary-foreground opacity-80 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{g.title}</h3>
                  <p className="text-muted-foreground">{g.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="gradient-primary rounded-3xl p-12 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-black text-primary-foreground mb-4">Készen Állsz a Tanulásra?</h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Csatlakozz több ezer diákhoz és tanárhoz – teljesen ingyenes!
            </p>
            <Button size="lg" className="bg-card text-foreground hover:bg-card/90 rounded-full text-lg font-bold px-10 shadow-xl" asChild>
              <Link to="/register">Ingyenes Regisztráció</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">TanuljVelem</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 TanuljVelem. Minden jog fenntartva.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

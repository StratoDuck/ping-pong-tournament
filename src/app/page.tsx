import dynamic from "next/dynamic";

const DynamicBracket = dynamic(() => import("../components/bracket"), {
  ssr: false,
});

const Home = async () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center justify-center">
        <DynamicBracket />
      </div>
    </main>
  );
};

export default Home;

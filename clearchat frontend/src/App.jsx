import { connectWS } from './ws';

export default function App() {
 
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4 font-inter">
            {/* ENTER YOUR NAME TO START CHATTING */}
            {showNamePopup && (
                <div className="fixed inset-0 flex items-center justify-center z-40">
                    <div className="bg-white rounded-xl shadow-lg max-w-md p-6">
                        <h1 className="text-xl font-semibold text-black">Enter your name</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Enter your name to start chatting. This will be used to identify
                        </p>
                        <form onSubmit={handleNameSubmit} className="mt-4">
                            <input
                                autoFocus
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 outline-green-500 placeholder-gray-400"
                                placeholder="Your name that"
                            />
                            <button
                                type="submit"
                                className="block ml-auto mt-3 px-4 py-1.5 rounded-full bg-green-500 text-white font-medium cursor-pointer">
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            )}
 {/* CHAT WINDOW */}
    {!showNamePopup && (
      <div className="w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border border-zinc-100">
        {/* CHAT HEADER */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-900/10 bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-700 text-white">
          <div className="h-10 w-10 rounded-full bg-white/10 ring-2 ring-white/25 flex items-center justify-center text-white font-semibold">
            R
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold text-white">
              Realtime Messaging Platform
            </div>

            {typers.length ? (
              <div className="text-xs text-violet-100">
                {typers.join(", ")} is typing...
              </div>
            ) : (
              ""
            )}
          </div>

          <div className="text-sm text-violet-100">
            Signed in as{" "}
            <span className="font-semibold text-white capitalize">
              {userName}
            </span>
          </div>
        </div>

        {/* CHAT MESSAGE LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-zinc-50 to-violet-50/40 flex flex-col">
          {messages.map((m) => {
            const mine = m.sender === userName;

            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] p-3 my-2 rounded-[18px] text-sm leading-5 shadow-sm border ${
                    mine
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-violet-500/30"
                      : "bg-white text-zinc-900 border-zinc-200"
                  }`}
                >
                  <div className="break-words whitespace-pre-wrap">
                    {m.text}
                  </div>

                  <div className="flex justify-between items-center mt-1 gap-16">
                    <div
                      className={`text-[11px] font-bold ${
                        mine ? "text-violet-100" : "text-zinc-700"
                      }`}
                    >
                      {m.sender}
                    </div>
                    <div
                      className={`text-[11px] ${
                        mine ? "text-violet-200" : "text-zinc-500"
                      }`}
                    >
                      {formatTime(m.ts)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CHAT TEXTAREA */}
        <div className="px-4 py-3 border-t border-zinc-200 bg-white">
          <div className="flex items-center gap-4 border border-zinc-200 rounded-full bg-white shadow-sm focus-within:ring-2 focus-within:ring-violet-300">
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full resize-none px-4 py-3 text-sm outline-none rounded-full placeholder-zinc-400 bg-transparent"
            />
            <button
              onClick={sendMessage}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2 mr-2 rounded-full text-sm font-semibold shadow-sm hover:from-violet-700 hover:to-indigo-700 cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    )}
          
        </div>
    );
}

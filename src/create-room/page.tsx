import "@/App.css";
import React, { useState } from "react";
import {
  ChevronRight,
  Users,
  Clock,
  QrCode,
  ListCheck,
  ListPlus,
  ListTodo,
} from "lucide-react";

const AttendanceModeSelector = () => {
  const modes = [
    {
      id: "check",
      title: "リストチェックモード",
      description:
        "リストのチェックのみを行います。リストに登録されていない参加者は登録できません",
      icon: ListCheck,
      features: ["高速チェックイン", "非接触", "自動記録"],
      gifUrl: "/public/test.jpg",
      color: "bg-indigo-500",
    },
    {
      id: "all",
      title: "受付モード",
      description: "リストのチェック、およびリスト外の参加者を受け付けます。",
      icon: ListTodo,
      features: ["正確な記録", "柔軟な対応", "詳細管理"],
      gifUrl: "/public/test.jpg",
      color: "bg-emerald-600",
    },
    {
      id: "regist",
      title: "受付モード",
      description: "リストのチェック、およびリスト外の参加者を受け付けます。",
      icon: ListPlus,
      features: ["正確な記録", "柔軟な対応", "詳細管理"],
      gifUrl: "/public/test.jpg",
      color: "bg-yellow-500",
    },
    {
      id: "soukai",
      title: "定期学生総会用モード",
      description: "動作と表記を定期学生総会用に最適化します。",
      icon: Users,
      features: ["時間管理", "遅刻防止", "自動締切"],
      gifUrl: "/public/test.jpg",
      color: "bg-red-600",
    },
  ];

  interface AttendanceMode {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    features: string[];
    gifUrl: string;
    color: string;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 custom_font">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            出席管理システム
          </h1>
          <p className="text-lg text-gray-600">
            イベントの動作モードを選択してください
          </p>
        </div>

        {/* モード選択カード */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          {modes.map((mode) => {
            const IconComponent = mode.icon;

            return (
              <div
                key={mode.id}
                className={`
                  relative cursor-pointer transition-all duration-300 transform h-full shadow-lg hover:shadow-xl
 
                `}
              >
                <div
                  className={`
                  bg-white rounded-xl p-6 h-full

                `}
                >
                  {/* アイコンとタイトル */}
                  <div className="flex items-center mb-4">
                    <div
                      className={`
                      ${mode.color} rounded-lg p-3 mr-4
                    `}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {mode.title}
                    </h3>
                  </div>

                  {/* 説明 */}
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    {mode.description}
                  </p>

                  {/* 機能リスト */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      主な機能:
                    </h4>
                    <ul className="space-y-1">
                      {mode.features.map((feature, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 flex items-center"
                        >
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 選択インジケーター */}
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="text-center mt-8 text-sm text-gray-500">
          モードは後から変更することも可能です
        </div>
      </div>
    </div>
  );
};

export default AttendanceModeSelector;

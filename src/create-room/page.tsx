import "@/App.css";
import { Card, CardHeader, CardBody } from "@yamada-ui/react";
import { IconButton } from "@yamada-ui/react";
import { ArrowRight } from "@yamada-ui/lucide";
import { Link } from "react-router";
import { Button } from "@yamada-ui/react";

function CreateRoom() {
  return (
    <main className="main_container">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>出席のみ</CardHeader>
          <CardBody>
            <IconButton icon={<ArrowRight />} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>リストチェック</CardHeader>
          <CardBody>
            <Button as={Link} to="/create-room/main" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>定期学生総会</CardHeader>
          <CardBody>
            <IconButton icon={<ArrowRight />} />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

export default CreateRoom;
